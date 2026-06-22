import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('artists')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get(':id/stats')
  getArtistStats(@Param('id', ParseUUIDPipe) artistProfileId: string) {
    return this.statsService.getArtistStats(artistProfileId);
  }
}
