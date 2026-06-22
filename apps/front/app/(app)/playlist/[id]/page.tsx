"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { TrackCard } from "@/components/track/TrackCard";
import { Spinner } from "@/components/ui/Spinner";
import { fetchApi } from "@/lib/api";
import type { PlaylistDetail } from "@/lib/social-types";

export default function PlaylistPage() {
  const params = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchApi<PlaylistDetail>(`/playlists/${params.id}`)
      .then(setPlaylist)
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  if (error) {
    return <p className="p-6 text-red-400">{error}</p>;
  }

  if (!playlist) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Bibliothèque
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-white">{playlist.title}</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {playlist.tracks.length} titre{playlist.tracks.length > 1 ? "s" : ""}
        {playlist.isPublic ? " · Publique" : " · Privée"}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {playlist.tracks.map(({ track }) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
      {playlist.tracks.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Playlist vide.</p>
      ) : null}
    </div>
  );
}
