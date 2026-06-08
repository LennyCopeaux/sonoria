import { fetchApi } from "@/lib/api";
import type { Track } from "@/lib/social-types";
import type { PlayerTrack } from "@/store/player";

export class PlaybackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaybackError";
  }
}

export async function fetchTrackForPlayback(
  trackId: string,
  artistName = "Artiste",
): Promise<PlayerTrack> {
  const track = await fetchApi<Track>(`/tracks/${trackId}`);

  if (track.status !== "READY") {
    throw new PlaybackError(
      `Ce titre est en cours de traitement (statut : ${track.status}). Réessayez dans quelques instants.`,
    );
  }

  if (!track.streamUrl) {
    throw new PlaybackError(
      "Flux audio indisponible. Vérifiez que media-service et MinIO sont démarrés.",
    );
  }

  return {
    id: track.id,
    title: track.title,
    artist: artistName,
    coverUrl: track.pochetteUrl ?? track.coverUrl ?? undefined,
    streamUrl: track.streamUrl,
    durationS: track.duration ?? undefined,
  };
}
