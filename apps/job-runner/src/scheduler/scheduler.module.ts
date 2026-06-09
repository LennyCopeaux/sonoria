import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { CronsService } from './crons.service';
import { QueuePublisherService } from '../queue/queue-publisher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { MEDIA_QUEUE } from '../processors/media-queue.processor';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: MEDIA_QUEUE }),
    PrismaModule,
    RedisModule,
  ],
  providers: [CronsService, QueuePublisherService],
})
export class SchedulerModule {}
