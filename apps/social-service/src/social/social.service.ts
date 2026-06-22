import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePagination, totalPages } from '@sonoria/utils';
import { toPaginationParams } from '../common/pagination';
import { CreateCommentDto } from './dto/social.dto';

const COMMENT_USER_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async likeTrack(userId: string, trackId: string) {
    await this.ensureTrackExists(trackId);

    await this.prisma.like.upsert({
      where: { userId_trackId: { userId, trackId } },
      create: { userId, trackId },
      update: {},
    });

    const count = await this.prisma.like.count({ where: { trackId } });
    return { liked: true, count };
  }

  async unlikeTrack(userId: string, trackId: string) {
    await this.ensureTrackExists(trackId);

    await this.prisma.like.deleteMany({ where: { userId, trackId } });

    const count = await this.prisma.like.count({ where: { trackId } });
    return { liked: false, count };
  }

  private async ensureTrackExists(trackId: string): Promise<void> {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });
    if (!track) {
      throw new NotFoundException('Track not found');
    }
  }
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFollowNotification(
    recipientUserId: string,
    fromUserId: string,
    artistId: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: recipientUserId,
        type: NotificationType.NEW_FOLLOWER,
        dataJson: { fromUserId, artistId },
      },
    });
  }

  async createCommentNotification(
    recipientUserId: string,
    trackId: string,
    commentId: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: recipientUserId,
        type: NotificationType.NEW_COMMENT,
        dataJson: { trackId, commentId },
      },
    });
  }

  async getUnread(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type:
          notification.type === NotificationType.NEW_FOLLOWER
            ? 'new_follower'
            : 'new_comment',
        data: notification.dataJson,
        createdAt: notification.createdAt,
      })),
      count: notifications.length,
    };
  }
}

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async followArtist(userId: string, artistId: string) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist.userId === userId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    await this.prisma.follow.upsert({
      where: { followerId_artistId: { followerId: userId, artistId } },
      create: { followerId: userId, artistId },
      update: {},
    });

    await this.notifications.createFollowNotification(
      artist.userId,
      userId,
      artistId,
    );

    return { following: true };
  }

  async unfollowArtist(userId: string, artistId: string) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    await this.prisma.follow.deleteMany({
      where: { followerId: userId, artistId },
    });

    return { following: false };
  }

  async getFollowers(artistId: string, page?: number, limit?: number) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const pagination = resolvePagination(toPaginationParams(page, limit));
    const where = { artistId };

    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        skip: pagination.offset,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: COMMENT_USER_SELECT,
          },
        },
      }),
      this.prisma.follow.count({ where }),
    ]);

    return {
      followers: followers.map((follow) => ({
        id: follow.follower.id,
        name: follow.follower.name,
        avatarUrl: follow.follower.avatarUrl,
        followedAt: follow.createdAt,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: totalPages(total, pagination.limit),
    };
  }
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createComment(userId: string, trackId: string, dto: CreateCommentDto) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.trackId !== trackId) {
        throw new BadRequestException('Invalid parent comment');
      }

      if (parent.parentId) {
        throw new BadRequestException('Replies cannot be nested further');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.body,
        userId,
        trackId,
        parentId: dto.parentId ?? null,
      },
      include: {
        user: { select: COMMENT_USER_SELECT },
      },
    });

    if (track.uploaderId !== userId) {
      await this.notifications.createCommentNotification(
        track.uploaderId,
        trackId,
        comment.id,
      );
    }

    return this.formatComment(comment);
  }

  async listComments(trackId: string, page?: number, limit?: number) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const pagination = resolvePagination(toPaginationParams(page, limit));
    const where = { trackId, parentId: null };

    const [roots, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip: pagination.offset,
        take: pagination.limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: COMMENT_USER_SELECT },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: COMMENT_USER_SELECT },
            },
          },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      comments: roots.map((comment) => ({
        ...this.formatComment(comment),
        replies: comment.replies.map((reply) => this.formatComment(reply)),
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: totalPages(total, pagination.limit),
    };
  }

  async deleteComment(commentId: string, userId: string, role: Role) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('Not allowed to delete this comment');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async reportComment(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { reportCount: { increment: 1 } },
    });

    return { reportCount: updated.reportCount };
  }

  private formatComment(comment: {
    id: string;
    content: string;
    userId: string;
    trackId: string;
    parentId: string | null;
    reportCount: number;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; name: string; avatarUrl: string | null };
  }) {
    return {
      id: comment.id,
      body: comment.content,
      userId: comment.userId,
      trackId: comment.trackId,
      parentId: comment.parentId,
      reportCount: comment.reportCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user,
    };
  }
}
