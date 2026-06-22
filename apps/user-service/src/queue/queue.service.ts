import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export interface StatsJobData {
  artistId: string;
}

export interface RecoJobData {
  userId: string;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queue: Queue;
  private readonly connection: Redis;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.getOrThrow<string>('REDIS_URL');
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

    const queueName = this.config.get<string>(
      'JOB_QUEUE_NAME',
      'media-processing',
    );

    this.queue = new Queue(queueName, { connection: this.connection });
  }

  async enqueueStatsAggregate(data: StatsJobData): Promise<void> {
    await this.queue.add('stats:aggregate', data, {
      jobId: `stats-${data.artistId}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async enqueueRecoRefresh(data: RecoJobData): Promise<void> {
    await this.queue.add('reco:refresh', data, {
      jobId: `reco-${data.userId}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
