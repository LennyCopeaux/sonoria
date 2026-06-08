import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface HealthStatus {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  redis: 'up' | 'down';
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const [dbStatus, redisStatus] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
    ]);

    const status: HealthStatus = {
      status: dbStatus === 'up' && redisStatus === 'up' ? 'ok' : 'degraded',
      db: dbStatus,
      redis: redisStatus,
    };

    const httpStatus = status.status === 'ok' ? 200 : 503;
    res.status(httpStatus).json(status);
  }

  private async checkDb(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
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
