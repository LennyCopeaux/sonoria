import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { RedisService } from '../redis/redis.service';

interface HealthStatus {
  status: 'ok' | 'degraded';
  redis: 'up' | 'down';
}

@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisService) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const redisStatus = await this.checkRedis();
    const status: HealthStatus = {
      status: redisStatus === 'up' ? 'ok' : 'degraded',
      redis: redisStatus,
    };
    res.status(status.status === 'ok' ? 200 : 503).json(status);
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
