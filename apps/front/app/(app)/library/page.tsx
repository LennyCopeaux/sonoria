"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Plus } from "lucide-react";

import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import { decodeToken, getAccessToken } from "@/lib/auth";
import type { PaginatedPlaylists, PlaylistSummary } from "@/lib/social-types";

export default function LibraryPage() {
  const router = useRouter();
  const { isLoggedIn, isReady } = useAuth();
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
      if (getAccessToken()) return;
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
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Bibliothèque</h1>
        <p className="mt-1 text-sm text-muted">
          Vos playlists et votre espace de création.
        </p>
      </header>

      {/* Create playlist */}
      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <ListPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">
            Créer une playlist
          </h2>
        </div>
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nom de la playlist"
            className="h-11 flex-1 rounded-xl border border-line bg-surface-2 px-4 text-sm text-white placeholder:text-muted-2 transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            type="submit"
            size="lg"
            disabled={creating || !title.trim()}
            className="sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Création…" : "Créer"}
          </Button>
        </form>
      </section>

      {/* My playlists */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-white">Mes playlists</h2>
        {playlists.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface/40 p-10 text-center">
            <p className="text-sm text-muted">
              Aucune playlist pour le moment. Créez-en une ci-dessus.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
