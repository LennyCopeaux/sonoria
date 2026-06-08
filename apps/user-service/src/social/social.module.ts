import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SocialController } from './social.controller';
import {
  CommentsService,
  FollowsService,
  LikesService,
  NotificationsService,
} from './social.service';

@Module({
  imports: [AuthModule],
  controllers: [SocialController],
  providers: [
    LikesService,
    FollowsService,
    CommentsService,
    NotificationsService,
  ],
})
export class SocialModule {}
