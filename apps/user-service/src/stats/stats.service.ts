import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { ArtistStats, DailyStreamCount, TopTrack } from './stats.types';

const STATS_WINDOW_DAYS = 7;
const TOP_TRACKS_LIMIT = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class StatsService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async getArtistStats(artistProfileId: string): Promise<ArtistStats> {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: artistProfileId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Artist profile not found');
    }

    const cached = await this.redis.get(`artist:stats:${artistProfileId}`);
    if (cached) {
      return JSON.parse(cached) as ArtistStats;
    }

    const stats = await this.computeArtistStats(artistProfileId);
    await this.queue.enqueueStatsAggregate({ artistId: artistProfileId });
    return stats;
  }

  private async computeArtistStats(
    artistProfileId: string,
  ): Promise<ArtistStats> {
    const tracks = await this.prisma.track.findMany({
      where: { artistProfileId },
      select: { id: true, title: true },
    });

    const trackIds = tracks.map((t) => t.id);
    const titleById = new Map(tracks.map((t) => [t.id, t.title]));
    const windowStart = new Date(Date.now() - STATS_WINDOW_DAYS * MS_PER_DAY);

    const [totalStreams, followersCount, recentListens, topRows] =
      await Promise.all([
        trackIds.length === 0
          ? 0
          : this.prisma.listeningHistory.count({
              where: { trackId: { in: trackIds } },
            }),
        this.prisma.follow.count({ where: { artistId: artistProfileId } }),
        trackIds.length === 0
          ? []
          : this.prisma.listeningHistory.findMany({
              where: {
                trackId: { in: trackIds },
                listenedAt: { gte: windowStart },
              },
              select: { listenedAt: true },
            }),
        trackIds.length === 0
          ? []
          : this.prisma.listeningHistory.groupBy({
              by: ['trackId'],
              where: { trackId: { in: trackIds } },
              _count: { trackId: true },
              orderBy: { _count: { trackId: 'desc' } },
              take: TOP_TRACKS_LIMIT,
            }),
      ]);

    const topTracks: TopTrack[] = topRows.map((row) => ({
      trackId: row.trackId,
      title: titleById.get(row.trackId) ?? 'Unknown',
      streams: row._count.trackId,
    }));

    return {
      totalStreams,
      streamsLast7Days: this.bucketByDay(
        recentListens.map((l) => l.listenedAt),
      ),
      topTracks,
      followersCount,
    };
  }

  private bucketByDay(timestamps: Date[]): DailyStreamCount[] {
    const counts = new Map<string, number>();
    const today = new Date();

    // Seed the last 7 days (including today) with zero so the series is dense.
    for (let i = STATS_WINDOW_DAYS - 1; i >= 0; i--) {
      const day = new Date(today.getTime() - i * MS_PER_DAY);
      counts.set(this.dayKey(day), 0);
    }

    for (const ts of timestamps) {
      const key = this.dayKey(ts);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return [...counts.entries()].map(([date, count]) => ({ date, count }));
  }

  private dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
