import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../config/queues.config';
import { CacheService } from './cache.service';
import { EmailService } from './email.service';
import { RecoService } from './reco.service';
import { StatsService } from './stats.service';
import { TranscodeService } from './transcode.service';

export const MEDIA_QUEUE = 'media-processing';

@Processor(MEDIA_QUEUE, {
  concurrency: 4,
})
export class MediaQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaQueueProcessor.name);

  constructor(
    private readonly transcodeService: TranscodeService,
    private readonly emailService: EmailService,
    private readonly statsService: StatsService,
    private readonly recoService: RecoService,
    private readonly cacheService: CacheService,
    private readonly config: ConfigService,
  ) {
    super();
    const concurrency = this.config.get<number>('JOB_CONCURRENCY', 4);
    this.logger.log(
      `Media queue worker ready (concurrency=${concurrency}, queue=${MEDIA_QUEUE})`,
    );
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case QUEUE_NAMES.TRANSCODE:
        await this.transcodeService.processJob(job.data);
        return;
      case QUEUE_NAMES.EMAIL:
        await this.emailService.send(job.data);
        return;
      case QUEUE_NAMES.STATS:
        await this.statsService.aggregate(job.data);
        return;
      case QUEUE_NAMES.RECO:
        await this.recoService.refresh(job.data);
        return;
      case QUEUE_NAMES.CACHE:
        await this.cacheService.invalidate(job.data);
        return;
      default:
        this.logger.warn(`Unsupported job name: ${job.name}`);
    }
  }
}
