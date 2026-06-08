"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, fetchApi } from "@/lib/api";
import type { PaginatedPlaylists, PlaylistSummary } from "@/lib/social-types";

interface AddToPlaylistProps {
  trackId: string;
  trackStatus: string;
}

export function AddToPlaylist({ trackId, trackStatus }: AddToPlaylistProps) {
  const { isLoggedIn, isReady, user } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !isLoggedIn || !user) return;

    setLoadingPlaylists(true);
    void fetchApi<PaginatedPlaylists>("/playlists/public")
      .then((data) => {
        const mine = data.playlists.filter((p) => p.ownerId === user.sub);
        setPlaylists(mine);
        if (mine[0]) {
          setSelectedId(mine[0].id);
        }
      })
      .catch(() => setError("Impossible de charger vos playlists"))
      .finally(() => setLoadingPlaylists(false));
  }, [isReady, isLoggedIn, user]);

  if (!isReady || !isLoggedIn) {
    return null;
  }

  if (trackStatus !== "READY") {
    return (
      <p className="text-sm text-zinc-500">
        Ce titre est en cours de traitement. Vous pourrez l&apos;ajouter à une playlist
        une fois prêt.
      </p>
    );
  }

  if (loadingPlaylists) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Spinner size="sm" />
        Chargement des playlists…
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucune playlist.{" "}
        <Link href="/library" className="text-primary hover:underline">
          Créez-en une dans votre bibliothèque
        </Link>
        .
      </p>
    );
  }

  const handleAdd = async () => {
    if (!selectedId) return;

    const playlist = playlists.find((p) => p.id === selectedId);
    if (!playlist) return;

    setAdding(true);
    setError(null);
    setMessage(null);

    try {
      await fetchApi(`/playlists/${selectedId}/tracks`, {
        method: "POST",
        body: JSON.stringify({
          trackId,
          position: playlist.trackCount ?? 0,
        }),
      });
      setMessage(`Ajouté à « ${playlist.title} »`);
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? { ...p, trackCount: (p.trackCount ?? 0) + 1 }
            : p,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ajout impossible");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-300">Ajouter à une playlist</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.title}
              {playlist.trackCount != null ? ` (${playlist.trackCount})` : ""}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={() => void handleAdd()}
          disabled={adding || !selectedId}
        >
          {adding ? <Spinner size="sm" /> : "Ajouter"}
        </Button>
      </div>
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
