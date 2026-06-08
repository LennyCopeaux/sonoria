export interface Track {
  id: string;
  title: string;
  slug: string;
  genre: string | null;
  tags?: string[];
  duration: number | null;
  pochetteUrl?: string | null;
  coverUrl?: string | null;
  status: string;
  playCount: number;
  artistProfileId?: string | null;
  streamUrl?: string;
  likeCount?: number;
  likedByMe?: boolean;
}

export interface PaginatedTracks {
  items: Track[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlaylistSummary {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  trackCount?: number;
  ownerId?: string;
  createdAt?: string;
}

export interface PaginatedPlaylists {
  playlists: PlaylistSummary[];
  total: number;
}

export interface PlaylistDetail extends PlaylistSummary {
  isPublic: boolean;
  tracks: Array<{
    position: number;
    track: Track;
  }>;
}

export interface LikeResponse {
  liked: boolean;
  count: number;
}

export interface CreateTrackResponse {
  trackId: string;
  uploadUrl: string;
  s3Key: string;
}

export interface ConfirmUploadResponse {
  status: "queued";
}

export interface Comment {
  id: string;
  body: string;
  userId: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
  replies?: Comment[];
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
}

export interface SearchResponse {
  tracks: Track[];
  artists: Array<{
    id: string;
    slug: string;
    name: string;
    avatarUrl: string | null;
  }>;
  total: number;
}
