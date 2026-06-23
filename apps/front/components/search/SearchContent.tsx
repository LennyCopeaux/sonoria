"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { FollowButton } from "@/components/artist/FollowButton";
import { TrackCard } from "@/components/track/TrackCard";
import { Spinner } from "@/components/ui/Spinner";
import { useFollowing } from "@/hooks/useFollowing";
import { fetchApi } from "@/lib/api";
import type { SearchResponse } from "@/lib/social-types";

export function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { artists: following } = useFollowing();
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const followingIds = new Set(following.map((a) => a.id));

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetchApi<SearchResponse>(
        `/search?q=${encodeURIComponent(q)}&type=track`,
      )
        .then(setResults)
        .catch(() => setResults({ tracks: [], artists: [], total: 0 }))
        .finally(() => setLoading(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [q]);

  return (
    <div className="py-6">
      <h1 className="mb-6 text-3xl font-bold text-white">
        Recherche{q ? ` : « ${q} »` : ""}
      </h1>

      {!q.trim() ? (
        <p className="text-sm text-muted-2">
          Utilisez la barre de recherche en haut.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : results ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">Titres</h2>
            {results.tracks.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {results.tracks.map((track, i) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    queue={results.tracks}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-2">Aucun titre.</p>
            )}
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">Artistes</h2>
            {results.artists.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {results.artists.map((artist) => (
                  <li
                    key={artist.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                  >
                    {artist.avatarUrl ? (
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={artist.avatarUrl}
                          alt={artist.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-soft text-sm font-bold text-white">
                        {artist.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">
                        {artist.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        @{artist.slug}
                      </p>
                    </div>
                    <FollowButton
                      artistId={artist.id}
                      following={followingIds.has(artist.id)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-2">Aucun artiste.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
