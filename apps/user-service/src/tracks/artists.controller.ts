import { Controller, Get, Param, Query } from '@nestjs/common';
import { OptionalUser } from '../auth/decorators/optional-user.decorator';
import { JwtPayload } from '../auth/types';
import { TracksService } from './tracks.service';
import { ListTracksQueryDto } from './dto/list-tracks-query.dto';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly tracksService: TracksService) {}

  @Get(':id/tracks')
  findArtistTracks(
    @Param('id') artistProfileId: string,
    @Query() query: ListTracksQueryDto,
    @OptionalUser() user: JwtPayload | undefined,
  ) {
    return this.tracksService.findByArtist(artistProfileId, query, user);
  }
}
