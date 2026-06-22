import { fetchApi } from "./api";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

const EXTENSION_MIME: Record<string, ImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function resolveImageMimeType(file: File): ImageMimeType | null {
  if (IMAGE_MIME_TYPES.includes(file.type as ImageMimeType)) {
    return file.type as ImageMimeType;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension) return null;
  return EXTENSION_MIME[extension] ?? null;
}

interface CoverUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/** Uploads a cover image for a track and returns its public URL. */
export async function uploadCover(trackId: string, file: File): Promise<string> {
  const mimeType = resolveImageMimeType(file);
  if (!mimeType) {
    throw new Error("Format d'image non supporté (JPG, PNG ou WEBP).");
  }

  const res = await fetchApi<CoverUrlResponse>("/media/cover-url", {
    method: "POST",
    body: JSON.stringify({ trackId, filename: file.name, mimeType }),
  });

  const put = await fetch(res.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: file,
  });
  if (!put.ok) {
    throw new Error("Échec de l'envoi de la pochette.");
  }

  return res.publicUrl;
}

/** Uploads a profile avatar image and returns its public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const mimeType = resolveImageMimeType(file);
  if (!mimeType) {
    throw new Error("Format d'image non supporté (JPG, PNG ou WEBP).");
  }

  const res = await fetchApi<CoverUrlResponse>("/media/avatar-url", {
    method: "POST",
    body: JSON.stringify({ userId, filename: file.name, mimeType }),
  });

  const put = await fetch(res.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: file,
  });
  if (!put.ok) {
    throw new Error("Échec de l'envoi de la photo.");
  }

  return res.publicUrl;
}
