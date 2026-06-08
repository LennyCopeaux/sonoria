import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export interface TranscodeJobData {
  trackId: string;
  s3Key: string;
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

  async enqueueTranscode(data: TranscodeJobData): Promise<void> {
    await this.queue.add('audio:transcode', data);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
