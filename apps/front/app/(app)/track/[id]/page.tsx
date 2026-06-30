"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Heart, Music, Play } from "lucide-react";

import { CommentSection } from "@/components/comments/CommentSection";
import { AddToPlaylist } from "@/components/playlist/AddToPlaylist";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { usePlayCount } from "@/hooks/usePlayCount";
import { fetchApi } from "@/lib/api";
import { coverGradient } from "@/lib/cover";
import { fetchTrackForPlayback, PlaybackError } from "@/lib/playTrack";
import type { LikeResponse, Track } from "@/lib/social-types";
import { usePlayerStore } from "@/store/player";

export default function TrackPage() {
  const params = useParams<{ id: string }>();
  const trackId = params.id;
  const play = usePlayerStore((s) => s.play);

  const [track, setTrack] = useState<Track | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [startingPlay, setStartingPlay] = useState(false);
  const playCount = usePlayCount(trackId, track?.playCount ?? 0);

  const load = useCallback(async () => {
    try {
      const data = await fetchApi<Track>(`/tracks/${trackId}`);
      setTrack(data);
      setLikeCount(data.likeCount ?? 0);
      setLiked(data.likedByMe ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Titre introuvable");
    }
  }, [trackId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLike = async () => {
    const res = await fetchApi<LikeResponse>(`/social/tracks/${trackId}/like`, {
      method: liked ? "DELETE" : "POST",
    });
    setLiked(res.liked);
    setLikeCount(res.count);
  };

  if (error) {
    return (
      <div className="py-8">
        <p className="text-primary-soft">{error}</p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const cover = track.coverUrl ?? track.pochetteUrl ?? null;

  return (
    <div className="py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Accueil
      </Link>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end">
        <div className="relative h-52 w-52 shrink-0 overflow-hidden rounded-2xl ring-1 ring-line/60">
          {cover ? (
            <Image
              src={cover}
              alt={track.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundImage: coverGradient(track.id) }}
            >
              <Music className="h-14 w-14 text-white/70" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white">{track.title}</h1>
          <p className="mt-2 text-muted">
            {track.genre ?? "Sans genre"} · {playCount} écoutes ·{" "}
            {track.status}
          </p>
          {playError ? (
            <p className="mt-2 text-sm text-primary-soft">{playError}</p>
          ) : null}
          <div className="mt-5 flex gap-3">
            <Button
              disabled={startingPlay}
              onClick={() => {
                setPlayError(null);
                setStartingPlay(true);
                void fetchTrackForPlayback(track.id)
                  .then(play)
                  .catch((err: unknown) => {
                    setPlayError(
                      err instanceof PlaybackError
                        ? err.message
                        : "Impossible de lire ce titre",
                    );
                  })
                  .finally(() => setStartingPlay(false));
              }}
            >
              <Play className="h-4 w-4 fill-current" />
              {startingPlay ? "…" : "Lecture"}
            </Button>
            <Button variant="secondary" onClick={() => void toggleLike()}>
              <Heart
                className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`}
              />
              {likeCount > 0 ? likeCount : "J'aime"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <AddToPlaylist trackId={trackId} trackStatus={track.status} />
      </div>

      <CommentSection trackId={trackId} />
    </div>
  );
}
