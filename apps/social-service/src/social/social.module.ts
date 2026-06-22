import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import {
  CommentsService,
  FollowsService,
  LikesService,
  NotificationsService,
} from './social.service';

@Module({
  controllers: [SocialController],
  providers: [
    LikesService,
    FollowsService,
    CommentsService,
    NotificationsService,
  ],
})
export class SocialModule {}
