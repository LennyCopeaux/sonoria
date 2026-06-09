import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { UserRecommendations } from './recommendations.types';

@Injectable()
export class RecommendationsService {
  constructor(private readonly redis: RedisService) {}

  async getForUser(userId: string): Promise<UserRecommendations> {
    const cached = await this.redis.get(`reco:${userId}`);
    if (!cached) {
      throw new NotFoundException('Recommendations not available yet');
    }

    return JSON.parse(cached) as UserRecommendations;
  }
}
