import { fetchApi } from "@/lib/api";
import type { Track } from "@/lib/social-types";
import type { PlayerTrack } from "@/store/player";

export const PLAY_RECORDED_EVENT = "sonoria:play-recorded";

export interface PlayRecordedDetail {
  trackId: string;
  playCount: number;
}

export class PlaybackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaybackError";
  }
}

/**
 * Lightweight PlayerTrack built from a list item, WITHOUT a stream URL.
 * Used to seed the player queue so next/prev can navigate a list; the player
 * resolves each track's stream URL lazily when it becomes current.
 */
export function toPlayerTrackLite(track: Track): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artistName ?? "Artiste",
    coverUrl: track.pochetteUrl ?? track.coverUrl ?? undefined,
    durationS: track.duration ?? undefined,
    likedByMe: track.likedByMe,
  };
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
    artist: track.artistName ?? artistName,
    coverUrl: track.pochetteUrl ?? track.coverUrl ?? undefined,
    streamUrl: track.streamUrl,
    durationS: track.duration ?? undefined,
    likedByMe: track.likedByMe ?? false,
  };
}

/** Enregistre une écoute côté API (incrémente playCount + historique). */
export async function recordTrackPlay(trackId: string): Promise<number | null> {
  try {
    const data = await fetchApi<{ playCount: number }>(`/tracks/${trackId}/play`, {
      method: "POST",
      authRedirect: false,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<PlayRecordedDetail>(PLAY_RECORDED_EVENT, {
          detail: { trackId, playCount: data.playCount },
        }),
      );
    }
    return data.playCount;
  } catch {
    return null;
  }
}
