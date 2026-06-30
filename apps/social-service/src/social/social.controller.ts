import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types';
import {
  CommentsService,
  FollowsService,
  LikesService,
  NotificationsService,
} from './social.service';
import { CreateCommentDto, PaginationQueryDto } from './dto/social.dto';

@Controller()
@UseGuards(AuthGuard)
export class SocialController {
  constructor(
    private readonly likes: LikesService,
    private readonly follows: FollowsService,
    private readonly comments: CommentsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Post('tracks/:id/like')
  likeTrack(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) trackId: string,
  ) {
    return this.likes.likeTrack(user.sub, trackId);
  }

  @Delete('tracks/:id/like')
  unlikeTrack(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) trackId: string,
  ) {
    return this.likes.unlikeTrack(user.sub, trackId);
  }

  @Post('artists/:id/follow')
  followArtist(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) artistId: string,
  ) {
    return this.follows.followArtist(user.sub, artistId);
  }

  @Delete('artists/:id/follow')
  unfollowArtist(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) artistId: string,
  ) {
    return this.follows.unfollowArtist(user.sub, artistId);
  }

  @Get('artists/:id/followers')
  getFollowers(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.follows.getFollowers(artistId, query.page, query.limit);
  }

  @Get('me/following')
  getFollowing(@CurrentUser() user: JwtPayload) {
    return this.follows.getFollowing(user.sub);
  }

  @Post('tracks/:id/comments')
  createComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) trackId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.createComment(user.sub, trackId, dto);
  }

  @Get('tracks/:id/comments')
  listComments(
    @Param('id', ParseUUIDPipe) trackId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.comments.listComments(trackId, query.page, query.limit);
  }

  @Delete('comments/:id')
  deleteComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) commentId: string,
  ) {
    return this.comments.deleteComment(commentId, user.sub, user.role);
  }

  @Post('comments/:id/report')
  @HttpCode(HttpStatus.OK)
  reportComment(@Param('id', ParseUUIDPipe) commentId: string) {
    return this.comments.reportComment(commentId);
  }

  @Get('notifications/unread')
  getUnreadNotifications(@CurrentUser() user: JwtPayload) {
    return this.notifications.getUnread(user.sub);
  }
}
