import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import {
  isQueueEnabled,
  parseEnabledQueues,
  QUEUE_NAMES,
  type QueueName,
} from '../config/queues.config';
import { S3Module } from '../s3/s3.module';
import { UserClientModule } from '../user-client/user-client.module';
import { TranscodeProcessor } from './transcode.processor';
import { TranscodeService } from './transcode.service';

export const MEDIA_QUEUE = 'media-processing';

@Module({})
export class ProcessorsModule {
  static register(enabledQueues?: Set<QueueName>): DynamicModule {
    const queues = enabledQueues ?? parseEnabledQueues(process.env['QUEUES']);
    const providers = [];

    if (isQueueEnabled(queues, QUEUE_NAMES.TRANSCODE)) {
      providers.push(TranscodeService, TranscodeProcessor);
    }

    return {
      module: ProcessorsModule,
      imports: [
        BullModule.registerQueue({
          name: MEDIA_QUEUE,
        }),
        S3Module,
        UserClientModule,
      ],
      providers,
    };
  }
}
