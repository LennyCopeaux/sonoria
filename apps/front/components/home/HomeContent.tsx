"use client";

import { useEffect, useState } from "react";

import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { TrackCard } from "@/components/track/TrackCard";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import type { PaginatedPlaylists, PaginatedTracks } from "@/lib/social-types";
import Link from "next/link";

export function HomeContent() {
  const { isLoggedIn } = useAuth();
  const [tracks, setTracks] = useState<PaginatedTracks | null>(null);
  const [playlists, setPlaylists] = useState<PaginatedPlaylists | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    const load = async () => {
      try {
        const [tracksData, playlistsData] = await Promise.all([
          fetchApi<PaginatedTracks>("/tracks?limit=10"),
          fetchApi<PaginatedPlaylists>("/playlists/public?limit=6"),
        ]);
        setTracks(tracksData);
        setPlaylists(playlistsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      }
    };

    void load();
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-zinc-400">
          Connectez-vous pour découvrir les titres et playlists.
        </p>
        <Link
          href="/auth/login"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (!tracks && !playlists && !error) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      {error ? (
        <p className="mb-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-white">En tendance</h2>
        {tracks && tracks.items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tracks.items.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Aucun titre disponible.</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold text-white">
          Playlists populaires
        </h2>
        {playlists && playlists.playlists.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Aucune playlist publique.</p>
        )}
      </section>
    </div>
  );
}
