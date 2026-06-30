"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ListPlus, Plus } from "lucide-react";

import { fetchApi } from "@/lib/api";
import { usePlaylists } from "@/hooks/usePlaylists";

interface AddToPlaylistMenuProps {
  trackId: string;
  /** Extra classes for the trigger button (icon button). */
  triggerClassName?: string;
  /** Open the popover upward (e.g. inside the bottom player). */
  direction?: "up" | "down";
  /** Horizontal alignment of the popover relative to the trigger. */
  align?: "left" | "right";
}

export function AddToPlaylistMenu({
  trackId,
  triggerClassName,
  direction = "down",
  align = "right",
}: AddToPlaylistMenuProps) {
  const { playlists, refresh } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleAdd = async (playlistId: string, trackCount?: number) => {
    setBusyId(playlistId);
    try {
      await fetchApi(`/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({ trackId, position: trackCount ?? 0 }),
      });
      setDoneId(playlistId);
      void refresh();
      window.setTimeout(() => setDoneId(null), 1500);
    } catch {
      // silencieux — l'utilisateur peut réessayer
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-label="Ajouter à une playlist"
        className={
          triggerClassName ??
          "flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        }
      >
        <ListPlus className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className={`absolute z-50 w-56 rounded-xl border border-line bg-surface-2 p-1 shadow-xl shadow-black/40 ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "right" ? "right-0" : "left-0"}`}
        >
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-2">
            Ajouter à une playlist
          </p>
          {playlists.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => void handleAdd(playlist.id, playlist.trackCount)}
                  disabled={busyId === playlist.id}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface/60 hover:text-white disabled:opacity-60"
                >
                  <span className="truncate">{playlist.title}</span>
                  {doneId === playlist.id ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <Link
              href="/library"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface/60"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Créer une playlist
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
