"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";

import { AddToPlaylistMenu } from "@/components/playlist/AddToPlaylistMenu";
import { fetchApi } from "@/lib/api";
import { fetchTrackForPlayback, PlaybackError, recordTrackPlay } from "@/lib/playTrack";
import type { LikeResponse } from "@/lib/social-types";
import { usePlayerStore } from "@/store/player";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const recordedTrackRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const {
    currentTrack,
    isPlaying,
    volume,
    shuffle,
    repeat,
    pause,
    togglePlay,
    next,
    prev,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // The source may still be loading (e.g. a freshly queued track whose
      // stream URL is being resolved). Ignore a transient failure here — the
      // load effect starts playback once the source is ready, and the audio
      // "error" handler covers genuine failures. Pausing here would cancel
      // the play the user just asked for.
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  // Load a NEW track only when its identity/source changes — NOT on every
  // play/pause toggle, otherwise the audio reloads and restarts from 0.
  // The play/pause effect above handles resuming at the current position.
  // Queued tracks arrive without a stream URL, so we resolve it on demand.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    let cancelled = false;

    const load = async () => {
      setPlaybackError(null);
      let url = currentTrack.streamUrl;
      let durationS = currentTrack.durationS;

      if (!url) {
        try {
          const resolved = await fetchTrackForPlayback(
            currentTrack.id,
            currentTrack.artist,
          );
          url = resolved.streamUrl;
          durationS = resolved.durationS ?? durationS;
        } catch (err) {
          if (cancelled) return;
          setPlaybackError(
            err instanceof PlaybackError
              ? err.message
              : "Lecture impossible — titre indisponible.",
          );
          pause();
          return;
        }
      }

      if (cancelled || !audio || !url) return;
      audio.src = url;
      setProgress(0);
      setDuration(durationS ?? 0);
      audio.load();

      if (usePlayerStore.getState().isPlaying) {
        void audio.play().catch(() => {
          if (cancelled) return;
          setPlaybackError(
            "Lecture impossible — fichier audio introuvable ou format non supporté.",
          );
          pause();
        });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentTrack, pause]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => next();
    const handleError = () => {
      setPlaybackError("Erreur de lecture audio.");
      pause();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [next, pause]);

  // Comptabilise une écoute quand la lecture démarre réellement (une fois par titre).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const handlePlaying = () => {
      if (recordedTrackRef.current === currentTrack.id) return;
      recordedTrackRef.current = currentTrack.id;
      void recordTrackPlay(currentTrack.id);
    };

    audio.addEventListener("playing", handlePlaying);
    return () => audio.removeEventListener("playing", handlePlaying);
  }, [currentTrack]);

  // Sync the heart with the like state carried by the current track.
  useEffect(() => {
    setLiked(currentTrack?.likedByMe ?? false);
  }, [currentTrack?.id, currentTrack?.likedByMe]);

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setProgress(value);
  };

  const handleLike = async () => {
    if (!currentTrack) return;
    setLikeLoading(true);
    try {
      const res = await fetchApi<LikeResponse>(
        `/social/tracks/${currentTrack.id}/like`,
        { method: liked ? "DELETE" : "POST" },
      );
      setLiked(res.liked);
    } catch {
      // ignore
    } finally {
      setLikeLoading(false);
    }
  };

  if (!currentTrack) {
    return (
      <footer className="shrink-0 border-t border-line bg-surface/60 px-6 py-4 backdrop-blur">
        <p className="text-center text-sm text-muted-2">
          {playbackError ?? "Aucune piste en lecture"}
        </p>
        <audio ref={audioRef} className="hidden" />
      </footer>
    );
  }

  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <footer className="shrink-0 border-t border-line bg-surface/80 px-3 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-4">
        {/* Track info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-3">
            {currentTrack.coverUrl ? (
              <Image
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-2">
                <Music className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {currentTrack.title}
            </p>
            <p className="truncate text-xs text-muted">
              {playbackError ?? currentTrack.artist}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleLike()}
            disabled={likeLoading}
            aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
            className={`ml-1 shrink-0 transition-colors ${
              liked ? "text-primary" : "text-muted hover:text-white"
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-primary" : ""}`} />
          </button>
          <AddToPlaylistMenu
            trackId={currentTrack.id}
            direction="up"
            align="left"
            triggerClassName="shrink-0 text-muted transition-colors hover:text-white"
          />
        </div>

        {/* Controls + progress */}
        <div className="flex flex-[2] flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`transition-colors ${shuffle ? "text-primary" : "text-muted hover:text-white"}`}
              aria-label="Lecture aléatoire"
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={prev}
              className="text-muted transition-colors hover:text-white"
              aria-label="Piste précédente"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:bg-primary-soft active:scale-95"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 translate-x-px fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={next}
              className="text-muted transition-colors hover:text-white"
              aria-label="Piste suivante"
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleRepeat}
              className={`transition-colors ${repeat !== "off" ? "text-primary" : "text-muted hover:text-white"}`}
              aria-label="Mode répétition"
            >
              <RepeatIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex w-full max-w-xl items-center gap-2 text-xs text-muted">
            <span className="tabular-nums">{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="range-slider flex-1"
              style={{
                background: `linear-gradient(to right, var(--primary) ${
                  duration ? (progress / duration) * 100 : 0
                }%, var(--surface-3) ${
                  duration ? (progress / duration) * 100 : 0
                }%)`,
              }}
              aria-label="Progression"
            />
            <span className="tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="hidden flex-1 items-center justify-end gap-2 lg:flex">
          <Volume2 className="h-4 w-4 text-muted" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="range-slider w-28"
            aria-label="Volume"
          />
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </footer>
  );
}
