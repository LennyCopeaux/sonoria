import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { TracksController } from './tracks.controller';
import { ArtistsController } from './artists.controller';
import { TracksService } from './tracks.service';
import { MediaClientService } from './media-client.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [TracksController, ArtistsController],
  providers: [TracksService, MediaClientService],
  exports: [TracksService],
})
export class TracksModule {}
