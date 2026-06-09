import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface CacheJobData {
  key: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async invalidate(data: CacheJobData): Promise<void> {
    if (!data.key?.trim()) {
      this.logger.warn('Cache invalidate called with empty key');
      return;
    }

    await this.redis.del(data.key);
    this.logger.log(`Invalidated cache key: ${data.key}`);
  }
}
