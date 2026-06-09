import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import {
  isQueueEnabled,
  parseEnabledQueues,
  QUEUE_NAMES,
  type QueueName,
} from '../config/queues.config';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { S3Module } from '../s3/s3.module';
import { UserClientModule } from '../user-client/user-client.module';
import { CacheService } from './cache.service';
import { EmailService } from './email.service';
import { MEDIA_QUEUE, MediaQueueProcessor } from './media-queue.processor';
import { RecoService } from './reco.service';
import { StatsService } from './stats.service';
import { TranscodeService } from './transcode.service';

export { MEDIA_QUEUE };

function anyJobQueueEnabled(queues: Set<QueueName>): boolean {
  return (
    isQueueEnabled(queues, QUEUE_NAMES.TRANSCODE) ||
    isQueueEnabled(queues, QUEUE_NAMES.EMAIL) ||
    isQueueEnabled(queues, QUEUE_NAMES.STATS) ||
    isQueueEnabled(queues, QUEUE_NAMES.RECO) ||
    isQueueEnabled(queues, QUEUE_NAMES.CACHE)
  );
}

@Module({})
export class ProcessorsModule {
  static register(enabledQueues?: Set<QueueName>): DynamicModule {
    const queues = enabledQueues ?? parseEnabledQueues(process.env['QUEUES']);
    const providers = [];

    if (anyJobQueueEnabled(queues)) {
      providers.push(
        TranscodeService,
        EmailService,
        StatsService,
        RecoService,
        CacheService,
        MediaQueueProcessor,
      );
    }

    return {
      module: ProcessorsModule,
      imports: [
        BullModule.registerQueue({ name: MEDIA_QUEUE }),
        PrismaModule,
        RedisModule,
        S3Module,
        UserClientModule,
      ],
      providers,
    };
  }
}
