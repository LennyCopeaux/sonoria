"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { TrackCard } from "@/components/track/TrackCard";
import { Spinner } from "@/components/ui/Spinner";
import { fetchApi } from "@/lib/api";
import type { SearchResponse } from "@/lib/social-types";

export function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-white">
        Recherche{q ? ` : « ${q} »` : ""}
      </h1>

      {!q.trim() ? (
        <p className="text-sm text-zinc-500">
          Utilisez la barre de recherche en haut.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : results ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Titres</h2>
            {results.tracks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {results.tracks.map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Aucun titre.</p>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Artistes</h2>
            {results.artists.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {results.artists.map((artist) => (
                  <li
                    key={artist.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white"
                  >
                    {artist.name}
                    <span className="ml-2 text-sm text-zinc-500">
                      @{artist.slug}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">Aucun artiste.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
