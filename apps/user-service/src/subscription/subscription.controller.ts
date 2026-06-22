import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  subscribe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.subscribe(user.sub, dto);
  }

  @Delete()
  cancel(@CurrentUser() user: JwtPayload) {
    return this.subscriptionService.cancel(user.sub);
  }

  @Get()
  getMySubscription(@CurrentUser() user: JwtPayload) {
    return this.subscriptionService.getForUser(user.sub);
  }
}
