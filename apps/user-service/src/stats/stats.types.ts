export interface DailyStreamCount {
  date: string;
  count: number;
}

export interface TopTrack {
  trackId: string;
  title: string;
  streams: number;
}

export interface ArtistStats {
  totalStreams: number;
  streamsLast7Days: DailyStreamCount[];
  topTracks: TopTrack[];
  followersCount: number;
}
