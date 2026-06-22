import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrackStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlugService } from '../common/slug.service';
import { resolvePagination, totalPages } from '@sonoria/utils';
import { toPaginationParams } from '../common/pagination';
import {
  AddPlaylistTrackDto,
  CreatePlaylistDto,
  UpdatePlaylistDto,
} from './dto/playlist.dto';

const TRACK_SELECT = {
  id: true,
  title: true,
  slug: true,
  genre: true,
  duration: true,
  coverUrl: true,
  status: true,
  playCount: true,
} as const;

@Injectable()
export class PlaylistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
  ) {}

  async create(userId: string, dto: CreatePlaylistDto) {
    const slug = await this.slugService.uniquePlaylistSlug(dto.title);

    const playlist = await this.prisma.playlist.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description ?? null,
        isPublic: dto.isPublic ?? true,
        ownerId: userId,
      },
    });

    return playlist;
  }

  async findById(playlistId: string, userId?: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          include: {
            track: { select: TRACK_SELECT },
          },
        },
      },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic && playlist.ownerId !== userId) {
      throw new ForbiddenException('This playlist is private');
    }

    return {
      ...playlist,
      tracks: playlist.tracks.map((entry) => ({
        position: entry.position,
        addedAt: entry.addedAt,
        track: entry.track,
      })),
    };
  }

  async update(playlistId: string, userId: string, dto: UpdatePlaylistDto) {
    const playlist = await this.requireOwner(playlistId, userId);

    const data: {
      title?: string;
      slug?: string;
      isPublic?: boolean;
      coverUrl?: string | null;
    } = {};

    if (dto.title !== undefined) {
      data.title = dto.title;
      data.slug = await this.slugService.uniquePlaylistSlug(
        dto.title,
        playlist.id,
      );
    }

    if (dto.isPublic !== undefined) {
      data.isPublic = dto.isPublic;
    }

    if (dto.coverUrl !== undefined) {
      data.coverUrl = dto.coverUrl;
    }

    return this.prisma.playlist.update({
      where: { id: playlist.id },
      data,
    });
  }

  async remove(playlistId: string, userId: string) {
    await this.requireOwner(playlistId, userId);
    await this.prisma.playlist.delete({ where: { id: playlistId } });
    return { success: true };
  }

  async addTrack(playlistId: string, userId: string, dto: AddPlaylistTrackDto) {
    await this.requireOwner(playlistId, userId);

    const track = await this.prisma.track.findUnique({
      where: { id: dto.trackId },
    });

    if (!track || track.status !== TrackStatus.READY) {
      throw new NotFoundException('Track not found or not ready');
    }

    const existing = await this.prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: { playlistId, trackId: dto.trackId },
      },
    });

    if (existing) {
      return this.prisma.playlistTrack.update({
        where: { id: existing.id },
        data: { position: dto.position },
      });
    }

    return this.prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId: dto.trackId,
        position: dto.position,
      },
    });
  }

  async removeTrack(playlistId: string, trackId: string, userId: string) {
    await this.requireOwner(playlistId, userId);

    await this.prisma.playlistTrack.deleteMany({
      where: { playlistId, trackId },
    });

    return { success: true };
  }

  async listPublic(page?: number, limit?: number) {
    const pagination = resolvePagination(toPaginationParams(page, limit));
    const where = { isPublic: true };

    const [playlists, total] = await Promise.all([
      this.prisma.playlist.findMany({
        where,
        skip: pagination.offset,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tracks: true } },
        },
      }),
      this.prisma.playlist.count({ where }),
    ]);

    return {
      playlists: playlists.map((playlist) => ({
        id: playlist.id,
        title: playlist.title,
        slug: playlist.slug,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        ownerId: playlist.ownerId,
        trackCount: playlist._count.tracks,
        createdAt: playlist.createdAt,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: totalPages(total, pagination.limit),
    };
  }

  private async requireOwner(playlistId: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.ownerId !== userId) {
      throw new ForbiddenException('Not allowed to modify this playlist');
    }

    return playlist;
  }
}
