"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CommentSection } from "@/components/comments/CommentSection";
import { AddToPlaylist } from "@/components/playlist/AddToPlaylist";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { fetchApi } from "@/lib/api";
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
    const res = await fetchApi<LikeResponse>(`/tracks/${trackId}/like`, {
      method: liked ? "DELETE" : "POST",
    });
    setLiked(res.liked);
    setLikeCount(res.count);
  };

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="mt-4 text-primary hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link href="/" className="text-sm text-zinc-400 hover:text-primary">
        ← Accueil
      </Link>

      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-5xl text-zinc-600">
          ♪
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{track.title}</h1>
          <p className="mt-2 text-zinc-400">
            {track.genre ?? "Sans genre"} · {track.playCount} écoutes ·{" "}
            {track.status}
          </p>
          {playError ? (
            <p className="mt-2 text-sm text-red-400">{playError}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
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
              {startingPlay ? "…" : "Lecture"}
            </Button>
            <Button variant="secondary" onClick={() => void toggleLike()}>
              {liked ? "♥" : "♡"} {likeCount > 0 ? likeCount : "Like"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <AddToPlaylist trackId={trackId} trackStatus={track.status} />
      </div>

      <CommentSection trackId={trackId} />
    </div>
  );
}
