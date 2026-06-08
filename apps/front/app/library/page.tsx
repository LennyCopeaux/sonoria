"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { CreateTrackForm } from "@/components/track/CreateTrackForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import { decodeToken, getAccessToken } from "@/lib/auth";
import type { PaginatedPlaylists, PlaylistSummary } from "@/lib/social-types";

export default function LibraryPage() {
  const router = useRouter();
  const { isLoggedIn, isReady, role } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<PaginatedPlaylists>("/playlists/public");
      const token = getAccessToken();
      const userId = token ? decodeToken(token)?.sub : null;
      const mine = userId
        ? data.playlists.filter((p) => p.ownerId === userId)
        : data.playlists;
      setPlaylists(mine);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      router.replace("/auth/login");
      return;
    }
    void load();
  }, [isReady, isLoggedIn, router]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await fetchApi("/playlists", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), isPublic: true }),
      });
      setTitle("");
      await load();
    } finally {
      setCreating(false);
    }
  };

  if (!isReady || !isLoggedIn || loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Bibliothèque</h1>

      {role === "ARTIST" ? (
        <section className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-1 text-lg font-semibold text-white">Publier un titre</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Uploadez un fichier MP3, WAV ou FLAC. Il sera traité automatiquement.
          </p>
          <CreateTrackForm />
        </section>
      ) : (
        <section className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">
            La publication de titres est réservée aux comptes{" "}
            <span className="text-white">Artiste</span>.{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              Créez un compte artiste
            </Link>{" "}
            pour uploader vos morceaux.
          </p>
        </section>
      )}

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="mb-8 flex max-w-md gap-2"
      >
        <Input
          label="Nouvelle playlist"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom de la playlist"
          className="flex-1"
        />
        <Button type="submit" disabled={creating} className="self-end">
          Créer
        </Button>
      </form>

      <h2 className="mb-4 text-lg font-semibold text-white">Mes playlists</h2>
      {playlists.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Aucune playlist. Créez-en une ci-dessus.
        </p>
      )}
    </div>
  );
}
