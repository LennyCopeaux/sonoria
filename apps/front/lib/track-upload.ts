const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/flac",
  "audio/x-flac",
] as const;

export type AudioMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXTENSION_MIME: Record<string, AudioMimeType> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
};

export function resolveAudioMimeType(file: File): AudioMimeType | null {
  if (ALLOWED_MIME_TYPES.includes(file.type as AudioMimeType)) {
    return file.type as AudioMimeType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension) return null;

  return EXTENSION_MIME[extension] ?? null;
}

export async function uploadAudioFile(
  uploadUrl: string,
  file: File,
  mimeType: AudioMimeType,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Échec de l'envoi du fichier audio");
  }
}
