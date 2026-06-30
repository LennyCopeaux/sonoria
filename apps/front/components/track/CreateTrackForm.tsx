"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ImagePlus, Music } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, fetchApi } from "@/lib/api";
import { uploadCover } from "@/lib/cover-upload";
import type {
  ConfirmUploadResponse,
  CreateTrackResponse,
} from "@/lib/social-types";
import { resolveAudioMimeType, uploadAudioFile } from "@/lib/track-upload";

interface CreateTrackFormProps {
  onPublished?: () => void;
}

export function CreateTrackForm({ onPublished }: CreateTrackFormProps = {}) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successTrackId, setSuccessTrackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const coverPreview = cover ? URL.createObjectURL(cover) : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessTrackId(null);

    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }
    if (!file) {
      setError("Sélectionnez un fichier audio (MP3, WAV ou FLAC)");
      return;
    }

    const mimeType = resolveAudioMimeType(file);
    if (!mimeType) {
      setError("Format non supporté. Utilisez MP3, WAV ou FLAC.");
      return;
    }

    setLoading(true);
    try {
      const created = await fetchApi<CreateTrackResponse>("/tracks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          genre: genre.trim() || undefined,
          filename: file.name,
          mimeType,
        }),
      });

      await uploadAudioFile(created.uploadUrl, file, mimeType);

      await fetchApi<ConfirmUploadResponse>(
        `/tracks/${created.trackId}/confirm-upload`,
        {
          method: "POST",
          body: JSON.stringify({ s3Key: created.s3Key }),
        },
      );

      if (cover) {
        const pochetteUrl = await uploadCover(created.trackId, cover);
        await fetchApi(`/tracks/${created.trackId}`, {
          method: "PATCH",
          body: JSON.stringify({ pochetteUrl }),
        });
      }

      setSuccessTrackId(created.trackId);
      setTitle("");
      setGenre("");
      setFile(null);
      setCover(null);
      onPublished?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Impossible de publier le titre");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-5 sm:flex-row sm:items-start"
    >
      {/* Cover picker */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="cover-file"
          className="group relative flex h-36 w-36 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-surface-2 transition-colors hover:border-primary/50"
        >
          {coverPreview ? (
            <Image
              src={coverPreview}
              alt="Aperçu de la pochette"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-2">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Pochette</span>
            </div>
          )}
          <input
            id="cover-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        <p className="text-center text-xs text-muted-2">JPG, PNG, WEBP</p>
      </div>

      {/* Fields */}
      <div className="flex w-full max-w-lg flex-col gap-4">
        <Input
          label="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom du morceau"
          required
        />
        <Input
          label="Genre (optionnel)"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="Ex. Électro, Jazz…"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Fichier audio</span>
          <label
            htmlFor="audio-file"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 transition-colors hover:border-primary/40"
          >
            <Music className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-sm text-muted">
              {file ? file.name : "Choisir un fichier — MP3, WAV ou FLAC"}
            </span>
            <input
              id="audio-file"
              type="file"
              accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary-soft ring-1 ring-primary/20">
            {error}
          </p>
        ) : null}

        {successTrackId ? (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-emerald-500/20">
            Titre envoyé ! Traitement en cours.{" "}
            <Link href={`/track/${successTrackId}`} className="underline">
              Voir le titre
            </Link>
          </p>
        ) : null}

        <Button type="submit" disabled={loading} className="w-fit">
          {loading ? <Spinner size="sm" /> : "Publier le titre"}
        </Button>
      </div>
    </form>
  );
}
