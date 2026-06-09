export interface ArtistStats {
  artistId: string;
  totalStreams: number;
  streamsLast7Days: number;
  followersCount: number;
  topTracks: Array<{ trackId: string; title: string; streams: number }>;
  computedAt: string;
}
