import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface StatsJobData {
  artistId: string;
}

export interface ArtistStats {
  artistId: string;
  totalStreams: number;
  streamsLast7Days: number;
  followersCount: number;
  topTracks: Array<{ trackId: string; title: string; streams: number }>;
  computedAt: string;
}

const STATS_TTL_SECONDS = 3600;

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async aggregate(data: StatsJobData): Promise<void> {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: data.artistId },
    });

    if (!profile) {
      this.logger.warn(`Artist profile ${data.artistId} not found — skipping stats`);
      return;
    }

    const tracks = await this.prisma.track.findMany({
      where: { artistProfileId: data.artistId },
      select: { id: true, title: true },
    });

    const trackIds = tracks.map((t) => t.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalStreams, streamsLast7Days, followersCount, history] =
      await Promise.all([
        trackIds.length === 0
          ? 0
          : this.prisma.listeningHistory.count({
              where: { trackId: { in: trackIds } },
            }),
        trackIds.length === 0
          ? 0
          : this.prisma.listeningHistory.count({
              where: {
                trackId: { in: trackIds },
                listenedAt: { gte: sevenDaysAgo },
              },
            }),
        this.prisma.follow.count({
          where: { artistId: data.artistId },
        }),
        trackIds.length === 0
          ? []
          : this.prisma.listeningHistory.groupBy({
              by: ['trackId'],
              where: { trackId: { in: trackIds } },
              _count: { trackId: true },
              orderBy: { _count: { trackId: 'desc' } },
              take: 5,
            }),
      ]);

    const trackTitleById = new Map(tracks.map((t) => [t.id, t.title]));

    const stats: ArtistStats = {
      artistId: data.artistId,
      totalStreams,
      streamsLast7Days,
      followersCount,
      topTracks: history.map((row) => ({
        trackId: row.trackId,
        title: trackTitleById.get(row.trackId) ?? 'Unknown',
        streams: row._count.trackId,
      })),
      computedAt: new Date().toISOString(),
    };

    await this.redis.setEx(
      `artist:stats:${data.artistId}`,
      JSON.stringify(stats),
      STATS_TTL_SECONDS,
    );

    this.logger.log(`Stats cached for artist ${data.artistId}`);
  }
}
