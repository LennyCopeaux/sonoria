"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";

import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { TrackCard } from "@/components/track/TrackCard";
import { Chip } from "@/components/ui/Chip";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import { coverGradient } from "@/lib/cover";
import { fetchTrackForPlayback } from "@/lib/playTrack";
import type {
  PaginatedPlaylists,
  PaginatedTracks,
  Track,
} from "@/lib/social-types";
import { usePlayerStore } from "@/store/player";

const ALL = "Tous";

function Hero({ track }: { track: Track }) {
  const play = usePlayerStore((s) => s.play);
  const cover = track.coverUrl ?? track.pochetteUrl ?? null;

  const handlePlay = async () => {
    try {
      const playerTrack = await fetchTrackForPlayback(
        track.id,
        track.artistName ?? "Artiste",
      );
      play(playerTrack);
    } catch {
      // ignore — surfaced elsewhere
    }
  };

  return (
    <div className="relative h-64 overflow-hidden rounded-[var(--radius-card)] sm:h-72">
      {cover ? (
        <Image
          src={cover}
          alt={track.title}
          fill
          className="object-cover"
          unoptimized
          priority
        />
      ) : (
        <div
          className="h-full w-full"
          style={{ backgroundImage: coverGradient(track.id) }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 sm:p-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-soft">
          À la une
        </span>
        <h2 className="max-w-lg text-3xl font-bold leading-tight text-white sm:text-4xl">
          {track.title}
        </h2>
        {track.genre ? (
          <p className="text-sm text-zinc-300">{track.genre}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void handlePlay()}
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primary-soft"
        >
          <Play className="h-4 w-4 fill-current" />
          Écouter
        </button>
      </div>
    </div>
  );
}

export function HomeContent() {
  const { isLoggedIn, isReady } = useAuth();
  const [tracks, setTracks] = useState<PaginatedTracks | null>(null);
  const [playlists, setPlaylists] = useState<PaginatedPlaylists | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(ALL);

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;

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
  }, [isReady, isLoggedIn]);

  const categories = useMemo(() => {
    const genres = new Set<string>();
    tracks?.items.forEach((t) => {
      if (t.genre) genres.add(t.genre);
    });
    return [ALL, ...Array.from(genres)];
  }, [tracks]);

  const visibleTracks = useMemo(() => {
    if (!tracks) return [];
    if (category === ALL) return tracks.items;
    return tracks.items.filter((t) => t.genre === category);
  }, [tracks, category]);

  if (!isReady || !isLoggedIn || (!tracks && !playlists && !error)) {
    return (
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const featured = tracks?.items[0];

  return (
    <div className="flex flex-col gap-8 py-2">
      {error ? (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary-soft ring-1 ring-primary/20">
          {error}
        </p>
      ) : null}

      {featured ? <Hero track={featured} /> : null}

      {/* Categories */}
      {categories.length > 1 ? (
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">
            Sélectionner une catégorie
          </h2>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <Chip
                key={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      {/* Popular tracks */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-white">Titres populaires</h2>
        {visibleTracks.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleTracks.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                queue={visibleTracks}
                index={i}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-2">Aucun titre pour le moment.</p>
        )}
      </section>

      {/* Popular playlists */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-white">
          Playlists populaires
        </h2>
        {playlists && playlists.playlists.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {playlists.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-2">Aucune playlist publique.</p>
        )}
      </section>
    </div>
  );
}
