import { Controller, Get, Param } from '@nestjs/common';
import { OptionalUser } from '../auth/decorators/optional-user.decorator';
import { JwtPayload } from '../auth/types';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('artists/:artistProfileId')
  getArtistStats(
    @Param('artistProfileId') artistProfileId: string,
    @OptionalUser() user: JwtPayload | undefined,
  ) {
    return this.statsService.getArtistStats(artistProfileId, user);
  }
}
