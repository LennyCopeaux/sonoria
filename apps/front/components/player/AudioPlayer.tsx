"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { usePlayerStore } from "@/store/player";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

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
      void audio.play().catch(() => pause());
    } else {
      audio.pause();
    }
  }, [isPlaying, pause]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.streamUrl) return;

    audio.src = currentTrack.streamUrl;
    setProgress(0);
    setDuration(currentTrack.durationS ?? 0);

    if (isPlaying) {
      void audio.play().catch(() => pause());
    }
  }, [currentTrack?.id, currentTrack?.streamUrl, currentTrack?.durationS, isPlaying, pause]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => next();

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [next]);

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setProgress(value);
  };

  if (!currentTrack) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-6 py-3 backdrop-blur">
        <p className="text-center text-sm text-zinc-500">
          Aucune piste en lecture
        </p>
        <audio ref={audioRef} className="hidden" />
      </footer>
    );
  }

  const repeatLabel =
    repeat === "one" ? "1" : repeat === "all" ? "∞" : "↻";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800">
            {currentTrack.coverUrl ? (
              <Image
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                ♪
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {currentTrack.title}
            </p>
            <p className="truncate text-xs text-zinc-400">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        <div className="flex flex-[2] flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`text-sm transition-colors ${shuffle ? "text-primary" : "text-zinc-400 hover:text-white"}`}
              aria-label="Lecture aléatoire"
            >
              ⇄
            </button>
            <button
              type="button"
              onClick={prev}
              className="text-zinc-300 transition-colors hover:text-white"
              aria-label="Piste précédente"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              onClick={next}
              className="text-zinc-300 transition-colors hover:text-white"
              aria-label="Piste suivante"
            >
              ⏭
            </button>
            <button
              type="button"
              onClick={toggleRepeat}
              className={`text-sm transition-colors ${repeat !== "off" ? "text-primary" : "text-zinc-400 hover:text-white"}`}
              aria-label="Mode répétition"
            >
              {repeatLabel}
            </button>
          </div>

          <div className="flex w-full max-w-md items-center gap-2 text-xs text-zinc-400">
            <span>{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="h-1 flex-1 cursor-pointer accent-primary"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="text-xs text-zinc-400">🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="h-1 w-24 cursor-pointer accent-primary"
            aria-label="Volume"
          />
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </footer>
  );
}
