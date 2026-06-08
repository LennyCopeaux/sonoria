"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/api";
import { fetchTrackForPlayback, PlaybackError } from "@/lib/playTrack";
import type { LikeResponse, Track } from "@/lib/social-types";
import { usePlayerStore } from "@/store/player";

interface TrackCardProps {
  track: Track;
  artistName?: string;
}

export function TrackCard({ track, artistName = "Artiste" }: TrackCardProps) {
  const play = usePlayerStore((s) => s.play);
  const [likeCount, setLikeCount] = useState(track.likeCount ?? 0);
  const [liked, setLiked] = useState(track.likedByMe ?? false);
  const [loading, setLoading] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setLikeCount(track.likeCount ?? 0);
    setLiked(track.likedByMe ?? false);
  }, [track.id, track.likeCount, track.likedByMe]);

  const handleLike = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<LikeResponse>(`/tracks/${track.id}/like`, {
        method: liked ? "DELETE" : "POST",
      });
      setLiked(res.liked);
      setLikeCount(res.count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    setPlayError(null);
    setPlaying(true);
    try {
      const playerTrack = await fetchTrackForPlayback(track.id, artistName);
      play(playerTrack);
    } catch (err) {
      setPlayError(
        err instanceof PlaybackError
          ? err.message
          : "Impossible de lire ce titre",
      );
    } finally {
      setPlaying(false);
    }
  };

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700">
      <div className="flex h-32 items-center justify-center rounded-lg bg-zinc-800 text-3xl text-zinc-600">
        {track.pochetteUrl || track.coverUrl ? "🎵" : "♪"}
      </div>

      <div>
        <Link
          href={`/track/${track.id}`}
          className="font-semibold text-white hover:text-primary"
        >
          {track.title}
        </Link>
        <p className="text-sm text-zinc-400">
          {artistName} · {track.playCount} écoutes
          {track.genre ? ` · ${track.genre}` : ""}
        </p>
      </div>

      {playError ? (
        <p className="text-xs text-red-400">{playError}</p>
      ) : null}

      <div className="mt-auto flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => void handlePlay()}
          disabled={playing}
        >
          {playing ? "…" : "Écouter"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => void handleLike()}
          disabled={loading}
          title="Like"
        >
          {liked ? "♥" : "♡"}
          {likeCount > 0 ? ` ${likeCount}` : ""}
        </Button>
      </div>
    </article>
  );
}
