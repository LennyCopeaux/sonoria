import { Module } from '@nestjs/common';
import { SlugService } from '../common/slug.service';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';

@Module({
  controllers: [PlaylistsController],
  providers: [PlaylistsService, SlugService],
})
export class PlaylistsModule {}
