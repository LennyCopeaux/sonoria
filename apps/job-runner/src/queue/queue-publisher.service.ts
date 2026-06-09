import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../config/queues.config';
import { MEDIA_QUEUE } from '../processors/media-queue.processor';
import type { CacheJobData } from '../processors/cache.service';
import type { EmailJobData } from '../processors/email.service';
import type { RecoJobData } from '../processors/reco.service';
import type { StatsJobData } from '../processors/stats.service';
import type { TranscodeJobData } from '../processors/transcode.service';

@Injectable()
export class QueuePublisherService {
  constructor(@InjectQueue(MEDIA_QUEUE) private readonly queue: Queue) {}

  async enqueueStats(data: StatsJobData): Promise<void> {
    await this.queue.add(QUEUE_NAMES.STATS, data, {
      jobId: `stats-${data.artistId}`,
      removeOnComplete: true,
    });
  }

  async enqueueReco(data: RecoJobData): Promise<void> {
    await this.queue.add(QUEUE_NAMES.RECO, data, {
      jobId: `reco-${data.userId}`,
      removeOnComplete: true,
    });
  }

  async enqueueEmail(data: EmailJobData): Promise<void> {
    await this.queue.add(QUEUE_NAMES.EMAIL, data, {
      removeOnComplete: true,
    });
  }

  async enqueueCacheInvalidate(data: CacheJobData): Promise<void> {
    await this.queue.add(QUEUE_NAMES.CACHE, data, {
      removeOnComplete: true,
    });
  }

  async enqueueTranscode(data: TranscodeJobData): Promise<void> {
    await this.queue.add(QUEUE_NAMES.TRANSCODE, data, {
      jobId: `transcode-${data.trackId}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
