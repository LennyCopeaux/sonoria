import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMyRecommendations(@CurrentUser() user: JwtPayload) {
    return this.recommendationsService.getForUser(user.sub);
  }
}
