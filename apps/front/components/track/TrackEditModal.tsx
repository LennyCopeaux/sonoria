"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, fetchApi } from "@/lib/api";
import { uploadCover } from "@/lib/cover-upload";
import type { Track } from "@/lib/social-types";

interface TrackEditModalProps {
  track: Track;
  onClose: () => void;
  onSaved: () => void;
}

export function TrackEditModal({ track, onClose, onSaved }: TrackEditModalProps) {
  const [title, setTitle] = useState(track.title);
  const [genre, setGenre] = useState(track.genre ?? "");
  const [tags, setTags] = useState((track.tags ?? []).join(", "));
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentCover = track.coverUrl ?? track.pochetteUrl ?? null;
  const preview = cover ? URL.createObjectURL(cover) : currentCover;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }

    setSaving(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const body: Record<string, unknown> = {
        title: title.trim(),
        genre: genre.trim() || undefined,
        tags: tagList,
      };

      if (cover) {
        body.pochetteUrl = await uploadCover(track.id, cover);
      }

      await fetchApi(`/tracks/${track.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Échec de la modification",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Modifier le titre</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <label
              htmlFor="edit-cover"
              className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2 transition-colors hover:border-primary/50"
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="Pochette"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-2" />
              )}
              <input
                id="edit-cover"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-white">Pochette</p>
              <p className="text-xs text-muted">
                Cliquez pour changer l&apos;image (JPG, PNG, WEBP).
              </p>
            </div>
          </div>

          <Input
            label="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Ex. Électro, Jazz…"
          />
          <Input
            label="Tags (séparés par des virgules)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="chill, été, remix"
          />

          {error ? (
            <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary-soft ring-1 ring-primary/20">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
