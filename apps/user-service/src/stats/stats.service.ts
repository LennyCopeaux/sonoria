import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtPayload } from '../auth/types';
import { ArtistStats } from './stats.types';

@Injectable()
export class StatsService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async getArtistStats(
    artistProfileId: string,
    user?: JwtPayload,
  ): Promise<ArtistStats> {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: artistProfileId },
    });

    if (!profile) {
      throw new NotFoundException('Artist profile not found');
    }

    if (user && user.role !== Role.ADMIN && profile.userId !== user.sub) {
      throw new ForbiddenException('You cannot view these stats');
    }

    const cached = await this.redis.get(`artist:stats:${artistProfileId}`);
    if (!cached) {
      throw new NotFoundException('Stats not available yet');
    }

    return JSON.parse(cached) as ArtistStats;
  }
}
