import { Injectable, Logger } from '@nestjs/common';
import { TrackStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface RecoJobData {
  userId: string;
}

export interface UserRecommendations {
  userId: string;
  trackIds: string[];
  computedAt: string;
}

const RECO_TTL_SECONDS = 86400;

@Injectable()
export class RecoService {
  private readonly logger = new Logger(RecoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async refresh(data: RecoJobData): Promise<void> {
    const recentListens = await this.prisma.listeningHistory.findMany({
      where: { userId: data.userId },
      orderBy: { listenedAt: 'desc' },
      take: 50,
      include: { track: { select: { genre: true } } },
    });

    const genreCounts = new Map<string, number>();
    for (const entry of recentListens) {
      const genre = entry.track.genre;
      if (!genre) continue;
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }

    const topGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    const following = await this.prisma.follow.findMany({
      where: { followerId: data.userId },
      select: { followingId: true },
    });

    const followedUserIds = following.map((f) => f.followingId);

    const followedProfiles =
      followedUserIds.length === 0
        ? []
        : await this.prisma.artistProfile.findMany({
            where: { userId: { in: followedUserIds } },
            select: { id: true },
          });

    const followedArtistIds = followedProfiles.map((p) => p.id);

    const filters = [];
    if (followedArtistIds.length > 0) {
      filters.push({ artistProfileId: { in: followedArtistIds } });
    }
    if (topGenres.length > 0) {
      filters.push({ genre: { in: topGenres } });
    }

    const tracks = await this.prisma.track.findMany({
      where: {
        status: TrackStatus.READY,
        ...(filters.length > 0 ? { OR: filters } : {}),
      },
      orderBy: { playCount: 'desc' },
      take: 20,
      select: { id: true },
    });

    const reco: UserRecommendations = {
      userId: data.userId,
      trackIds: tracks.map((t) => t.id),
      computedAt: new Date().toISOString(),
    };

    await this.redis.setEx(
      `reco:${data.userId}`,
      JSON.stringify(reco),
      RECO_TTL_SECONDS,
    );

    this.logger.log(
      `Recommendations cached for user ${data.userId} (${reco.trackIds.length} tracks)`,
    );
  }
}
