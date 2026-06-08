"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, fetchApi } from "@/lib/api";
import type { ConfirmUploadResponse, CreateTrackResponse } from "@/lib/social-types";
import { resolveAudioMimeType, uploadAudioFile } from "@/lib/track-upload";

export function CreateTrackForm() {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successTrackId, setSuccessTrackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      setSuccessTrackId(created.trackId);
      setTitle("");
      setGenre("");
      setFile(null);
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
    <form onSubmit={(e) => void handleSubmit(e)} className="flex max-w-lg flex-col gap-4">
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
        <label htmlFor="audio-file" className="text-sm font-medium text-zinc-300">
          Fichier audio
        </label>
        <input
          id="audio-file"
          type="file"
          accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-zinc-700"
        />
        <p className="text-xs text-zinc-500">MP3, WAV ou FLAC — max. selon votre stockage</p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      ) : null}

      {successTrackId ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Titre envoyé ! Traitement en cours.{" "}
          <Link href={`/track/${successTrackId}`} className="underline">
            Voir le titre
          </Link>
        </p>
      ) : null}

      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? <Spinner size="sm" /> : "Publier le titre"}
      </Button>
    </form>
  );
}
