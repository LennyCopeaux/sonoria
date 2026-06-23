"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Music, Play } from "lucide-react";

import { fetchApi } from "@/lib/api";
import { coverGradient } from "@/lib/cover";
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

  const cover = track.coverUrl ?? track.pochetteUrl ?? null;

  useEffect(() => {
    setLikeCount(track.likeCount ?? 0);
    setLiked(track.likedByMe ?? false);
  }, [track.id, track.likeCount, track.likedByMe]);

  const handleLike = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<LikeResponse>(
        `/social/tracks/${track.id}/like`,
        { method: liked ? "DELETE" : "POST" },
      );
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
    <article className="group flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-line/60">
        {cover ? (
          <Image
            src={cover}
            alt={track.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundImage: coverGradient(track.id) }}
          >
            <Music className="h-10 w-10 text-white/70" />
          </div>
        )}

        {/* dark overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        {/* like button */}
        <button
          type="button"
          onClick={() => void handleLike()}
          disabled={loading}
          aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <Heart
            className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`}
          />
        </button>

        {/* play button */}
        <button
          type="button"
          onClick={() => void handlePlay()}
          disabled={playing}
          aria-label="Lire"
          className="absolute bottom-3 right-3 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-primary text-white opacity-0 shadow-lg shadow-primary/30 transition-all duration-200 hover:bg-primary-soft group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Play className="h-5 w-5 translate-x-px fill-current" />
        </button>
      </div>

      <div className="min-w-0">
        <Link
          href={`/track/${track.id}`}
          className="block truncate text-sm font-semibold text-white hover:text-primary"
        >
          {track.title}
        </Link>
        <p className="truncate text-xs text-muted">
          {artistName}
          {track.genre ? ` · ${track.genre}` : ""}
        </p>
        {playError ? (
          <p className="mt-1 text-xs text-primary-soft">{playError}</p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-2">
            {track.playCount} écoutes
            {likeCount > 0 ? ` · ${likeCount} j'aime` : ""}
          </p>
        )}
      </div>
    </article>
  );
}
