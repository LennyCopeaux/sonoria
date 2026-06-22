"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { Camera } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useProfile } from "@/hooks/useProfile";
import { ApiError, fetchApi } from "@/lib/api";
import { uploadAvatar } from "@/lib/cover-upload";
import type { Profile } from "@/lib/social-types";

function roleLabel(role: string): string {
  switch (role) {
    case "SUBSCRIBER":
      return "Premium";
    case "ARTIST":
      return "Artiste";
    case "ADMIN":
      return "Admin";
    default:
      return "Membre";
  }
}

export default function ProfilePage() {
  const { profile, loading, refresh } = useProfile();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.artist?.bio ?? "");
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return <p className="py-8 text-muted">Profil indisponible.</p>;
  }

  const p: Profile = profile;
  const preview = avatar ? URL.createObjectURL(avatar) : p.avatarUrl;
  const initial = p.name.charAt(0).toUpperCase() || "?";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: name.trim() };
      if (avatar) {
        body.avatarUrl = await uploadAvatar(p.id, avatar);
      }
      if (p.artist) {
        body.bio = bio;
      }
      await fetchApi("/users/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setAvatar(null);
      setSaved(true);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Échec de la mise à jour",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Mon profil</h1>
        <p className="mt-1 text-sm text-muted">
          Gérez vos informations et votre photo.
        </p>
      </header>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-6 rounded-[var(--radius-card)] border border-line bg-surface p-6"
      >
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <label
            htmlFor="avatar"
            className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-line"
          >
            {preview ? (
              <Image
                src={preview}
                alt="Avatar"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-soft text-3xl font-bold text-white">
                {initial}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </span>
            <input
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-white">{p.name}</p>
              <Badge variant="primary">{roleLabel(p.role)}</Badge>
            </div>
            <p className="text-sm text-muted">{p.email}</p>
            <p className="mt-1 text-xs text-muted-2">
              Cliquez sur la photo pour la changer.
            </p>
          </div>
        </div>

        <Input
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {p.artist ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-muted">
              Bio artiste
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Parlez de votre univers musical…"
              className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-muted-2 transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary-soft ring-1 ring-primary/20">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-emerald-500/20">
            Profil mis à jour.
          </p>
        ) : null}

        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? <Spinner size="sm" /> : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
