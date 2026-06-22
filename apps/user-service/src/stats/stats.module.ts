import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [QueueModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
