"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Music, Pencil, Trash2, UploadCloud } from "lucide-react";

import { TrackEditModal } from "@/components/track/TrackEditModal";
import { CreateTrackForm } from "@/components/track/CreateTrackForm";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";
import { coverGradient } from "@/lib/cover";
import type { PaginatedTracks, Track } from "@/lib/social-types";

const STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-surface-3 text-muted" },
  PROCESSING: {
    label: "Transcoding…",
    className: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20",
  },
  READY: {
    label: "Disponible",
    className: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20",
  },
  ERROR: {
    label: "Erreur",
    className: "bg-primary/15 text-primary-soft ring-1 ring-primary/20",
  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.PENDING!;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, isReady, role } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [editing, setEditing] = useState<Track | null>(null);

  const loadTracks = useCallback(async () => {
    setLoadingTracks(true);
    try {
      const data = await fetchApi<PaginatedTracks>("/tracks?artistId=me");
      setTracks(data.items);
    } catch {
      setTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      router.replace("/auth/login");
      return;
    }
    if (role !== "ARTIST") {
      router.replace("/library");
      return;
    }
    void loadTracks();
  }, [isReady, isLoggedIn, role, router, loadTracks]);

  const handleDelete = async (track: Track) => {
    if (!window.confirm(`Supprimer « ${track.title} » ?`)) return;
    try {
      await fetchApi(`/tracks/${track.id}`, { method: "DELETE" });
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
    } catch {
      // ignore
    }
  };

  if (!isReady || !isLoggedIn || role !== "ARTIST") {
    return (
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Dashboard artiste</h1>
        <p className="mt-1 text-sm text-muted">
          Publiez vos titres et gérez votre catalogue.
        </p>
      </header>

      {/* Publish */}
      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <UploadCloud className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Publier un titre</h2>
            <p className="text-sm text-muted">
              MP3, WAV ou FLAC — traité automatiquement après l&apos;upload.
            </p>
          </div>
        </div>
        <CreateTrackForm onPublished={() => void loadTracks()} />
      </section>

      {/* My tracks */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-white">Mes pistes</h2>
        {loadingTracks ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : tracks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {tracks.map((track) => {
              const cover = track.coverUrl ?? track.pochetteUrl ?? null;
              return (
                <div
                  key={track.id}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={track.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{ backgroundImage: coverGradient(track.id) }}
                      >
                        <Music className="h-5 w-5 text-white/70" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/track/${track.id}`}
                      className="block truncate font-medium text-white hover:text-primary"
                    >
                      {track.title}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {track.genre ?? "Sans genre"} · {track.playCount} écoutes
                    </p>
                  </div>

                  <StatusBadge status={track.status} />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(track)}
                      aria-label="Modifier"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(track)}
                      aria-label="Supprimer"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary/15 hover:text-primary-soft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface/40 p-10 text-center">
            <p className="text-sm text-muted">
              Aucune piste publiée. Utilisez le formulaire ci-dessus.
            </p>
          </div>
        )}
      </section>

      {editing ? (
        <TrackEditModal
          track={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void loadTracks();
          }}
        />
      ) : null}
    </div>
  );
}
