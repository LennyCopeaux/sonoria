export interface RecoTrack {
  id: string;
  title: string;
  slug: string;
  genre: string | null;
  duration: number | null;
  pochetteUrl: string | null;
  playCount: number;
  artistProfileId: string | null;
}

export interface RecommendationsResponse {
  tracks: RecoTrack[];
  source: 'personalized' | 'trending';
}

interface CachedReco {
  userId: string;
  trackIds: string[];
  computedAt: string;
}

export type { CachedReco };
