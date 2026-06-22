import { Injectable } from '@nestjs/common';
import { TrackStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';
import {
  CachedReco,
  RecommendationsResponse,
  RecoTrack,
} from './recommendations.types';

const TRENDING_LIMIT = 20;

const TRACK_SELECT = {
  id: true,
  title: true,
  slug: true,
  genre: true,
  duration: true,
  coverUrl: true,
  playCount: true,
  artistProfileId: true,
} as const;

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async getForUser(userId: string): Promise<RecommendationsResponse> {
    // Refresh the personalized cache in the background regardless of outcome.
    await this.queue.enqueueRecoRefresh({ userId });

    const cached = await this.redis.get(`reco:${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached) as CachedReco;
      const tracks = await this.loadTracks(parsed.trackIds);
      if (tracks.length > 0) {
        return { tracks, source: 'personalized' };
      }
    }

    return { tracks: await this.loadTrending(), source: 'trending' };
  }

  private async loadTracks(trackIds: string[]): Promise<RecoTrack[]> {
    if (trackIds.length === 0) {
      return [];
    }

    const tracks = await this.prisma.track.findMany({
      where: { id: { in: trackIds }, status: TrackStatus.READY },
      select: TRACK_SELECT,
    });

    const byId = new Map(tracks.map((t) => [t.id, t]));
    // Preserve the relevance order produced by the reco job.
    return trackIds
      .map((id) => byId.get(id))
      .filter((t): t is (typeof tracks)[number] => t !== undefined)
      .map((t) => this.toRecoTrack(t));
  }

  private async loadTrending(): Promise<RecoTrack[]> {
    const tracks = await this.prisma.track.findMany({
      where: { status: TrackStatus.READY },
      orderBy: { playCount: 'desc' },
      take: TRENDING_LIMIT,
      select: TRACK_SELECT,
    });

    return tracks.map((t) => this.toRecoTrack(t));
  }

  private toRecoTrack(track: {
    id: string;
    title: string;
    slug: string;
    genre: string | null;
    duration: number | null;
    coverUrl: string | null;
    playCount: number;
    artistProfileId: string | null;
  }): RecoTrack {
    return {
      id: track.id,
      title: track.title,
      slug: track.slug,
      genre: track.genre,
      duration: track.duration,
      pochetteUrl: track.coverUrl,
      playCount: track.playCount,
      artistProfileId: track.artistProfileId,
    };
  }
}
