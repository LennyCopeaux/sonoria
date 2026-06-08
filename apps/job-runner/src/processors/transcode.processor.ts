import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { TranscodeJobData, TranscodeService } from './transcode.service';

export const MEDIA_QUEUE = 'media-processing';

@Processor(MEDIA_QUEUE, {
  concurrency: 4,
})
export class TranscodeProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscodeProcessor.name);

  constructor(
    private readonly transcodeService: TranscodeService,
    private readonly config: ConfigService,
  ) {
    super();
    const concurrency = this.config.get<number>('JOB_CONCURRENCY', 4);
    this.logger.log(
      `Transcode worker ready (concurrency=${concurrency}, queue=${MEDIA_QUEUE})`,
    );
  }

  async process(job: Job<TranscodeJobData>): Promise<void> {
    if (job.name !== 'audio:transcode') {
      this.logger.warn(`Ignoring unsupported job name: ${job.name}`);
      return;
    }

    await this.transcodeService.processJob(job.data);
  }
}
