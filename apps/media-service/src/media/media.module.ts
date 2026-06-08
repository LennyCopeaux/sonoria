import { Module } from '@nestjs/common';
import { S3Module } from '../s3/s3.module';
import { QueueModule } from '../queue/queue.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [S3Module, QueueModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
