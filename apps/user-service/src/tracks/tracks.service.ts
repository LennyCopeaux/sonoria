import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Track, TrackStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { resolvePagination, totalPages, slugify } from '@sonoria/utils';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types';
import { MediaClientService } from './media-client.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { InternalUpdateTrackDto } from './dto/internal-update-track.dto';
import { ListTracksQueryDto } from './dto/list-tracks-query.dto';

export interface TrackResponse {
  id: string;
  title: string;
  slug: string;
  genre: string | null;
  tags: string[];
  duration: number | null;
  pochetteUrl: string | null;
  status: TrackStatus;
  playCount: number;
  artistProfileId: string | null;
  uploaderId: string;
  waveformJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  streamUrl?: string;
}

@Injectable()
export class TracksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaClient: MediaClientService,
  ) {}

  async create(
    user: JwtPayload,
    dto: CreateTrackDto,
  ): Promise<{ trackId: string; uploadUrl: string }> {
    const artistProfile = await this.getOrCreateArtistProfile(user.sub);

    const slug = await this.generateUniqueSlug(dto.title);

    const data: Prisma.TrackUncheckedCreateInput = {
      title: dto.title,
      slug,
      tags: dto.tags ?? [],
      status: TrackStatus.PENDING,
      uploaderId: user.sub,
      artistProfileId: artistProfile.id,
    };
    if (dto.genre !== undefined) data.genre = dto.genre;
    if (dto.pochetteUrl !== undefined) data.coverUrl = dto.pochetteUrl;

    const track = await this.prisma.track.create({ data });

    const { uploadUrl } = await this.mediaClient.getUploadUrl(
      track.id,
      dto.filename,
      dto.mimeType,
    );

    return { trackId: track.id, uploadUrl };
  }

  async findAll(
    query: ListTracksQueryDto,
    user?: JwtPayload,
  ): Promise<{
    items: TrackResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit, offset } = resolvePagination(query);
    const where = await this.buildListWhere(query, user);

    const [tracks, total] = await Promise.all([
      this.prisma.track.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.track.count({ where }),
    ]);

    return {
      items: tracks.map((t) => this.toResponse(t)),
      total,
      page,
      limit,
      totalPages: totalPages(total, limit),
    };
  }

  async findOne(id: string, user?: JwtPayload): Promise<TrackResponse> {
    const track = await this.findTrackOrThrow(id);
    this.assertCanView(track, user);

    if (track.status === TrackStatus.READY) {
      const quality =
        user?.role === Role.SUBSCRIBER ? 'hq' : 'std';
      const streamUrl = await this.mediaClient.getStreamUrl(
        track.id,
        quality,
        user?.role ?? Role.VISITOR,
      );
      return this.toResponse(track, streamUrl);
    }

    return this.toResponse(track);
  }

  async update(
    id: string,
    user: JwtPayload,
    dto: UpdateTrackDto,
  ): Promise<TrackResponse> {
    const track = await this.findTrackOrThrow(id);
    this.assertOwner(track, user);

    const updated = await this.prisma.track.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.genre !== undefined && { genre: dto.genre }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.pochetteUrl !== undefined && { coverUrl: dto.pochetteUrl }),
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const track = await this.findTrackOrThrow(id);

    if (user.role !== Role.ADMIN) {
      this.assertOwner(track, user);
    }

    await this.mediaClient.deleteMedia(id).catch(() => undefined);
    await this.prisma.track.delete({ where: { id } });
  }

  async play(id: string, user: JwtPayload): Promise<{ playCount: number }> {
    const track = await this.findTrackOrThrow(id);

    if (track.status !== TrackStatus.READY) {
      throw new ForbiddenException('Track is not available for playback');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.track.update({
        where: { id },
        data: { playCount: { increment: 1 } },
      }),
      this.prisma.listeningHistory.create({
        data: { userId: user.sub, trackId: id },
      }),
    ]);

    return { playCount: updated.playCount };
  }

  async internalUpdate(
    id: string,
    dto: InternalUpdateTrackDto,
  ): Promise<TrackResponse> {
    await this.findTrackOrThrow(id);

    const updated = await this.prisma.track.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.s3KeyStd !== undefined && { s3KeyStd: dto.s3KeyStd }),
        ...(dto.s3KeyHq !== undefined && { s3KeyHq: dto.s3KeyHq }),
        ...(dto.waveformJson !== undefined && {
          waveformJson: dto.waveformJson,
        }),
      },
    });

    return this.toResponse(updated);
  }

  async findByArtist(
    artistProfileId: string,
    query: ListTracksQueryDto,
    user?: JwtPayload,
  ): Promise<{
    items: TrackResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.findAll(
      { ...query, artistId: artistProfileId },
      user,
    );
  }

  private async buildListWhere(
    query: ListTracksQueryDto,
    user?: JwtPayload,
  ): Promise<Prisma.TrackWhereInput> {
    const where: Prisma.TrackWhereInput = {};

    if (query.genre) {
      where.genre = query.genre;
    }

    if (query.artistId) {
      if (query.artistId === 'me') {
        if (!user) {
          throw new ForbiddenException('Authentication required');
        }
        const profile = await this.prisma.artistProfile.findUnique({
          where: { userId: user.sub },
        });
        if (!profile) {
          where.artistProfileId = 'none';
        } else {
          where.artistProfileId = profile.id;
        }
      } else {
        where.artistProfileId = query.artistId;
      }
    }

    if (query.status) {
      where.status = query.status;
    } else if (user?.role !== Role.ARTIST && user?.role !== Role.ADMIN) {
      where.status = TrackStatus.READY;
    }

    return where;
  }

  private async getOrCreateArtistProfile(userId: string) {
    const existing = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const baseSlug = slugify(user.name) || 'artist';
    const slug = `${baseSlug}-${userId.slice(0, 8)}`;

    return this.prisma.artistProfile.create({
      data: { userId, slug },
    });
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'track';
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = randomBytes(4).toString('hex');
      const slug = `${base}-${suffix}`;
      const exists = await this.prisma.track.findUnique({ where: { slug } });
      if (!exists) return slug;
    }
    return `${base}-${randomBytes(8).toString('hex')}`;
  }

  private async findTrackOrThrow(id: string): Promise<Track> {
    const track = await this.prisma.track.findUnique({ where: { id } });
    if (!track) {
      throw new NotFoundException('Track not found');
    }
    return track;
  }

  private assertOwner(track: Track, user: JwtPayload): void {
    if (track.uploaderId !== user.sub) {
      throw new ForbiddenException('You do not own this track');
    }
  }

  private assertCanView(track: Track, user?: JwtPayload): void {
    if (track.status === TrackStatus.READY) return;

    if (!user) {
      throw new NotFoundException('Track not found');
    }

    if (
      user.role === Role.ADMIN ||
      track.uploaderId === user.sub
    ) {
      return;
    }

    throw new NotFoundException('Track not found');
  }

  private toResponse(track: Track, streamUrl?: string): TrackResponse {
    const response: TrackResponse = {
      id: track.id,
      title: track.title,
      slug: track.slug,
      genre: track.genre,
      tags: track.tags,
      duration: track.duration,
      pochetteUrl: track.coverUrl,
      status: track.status,
      playCount: track.playCount,
      artistProfileId: track.artistProfileId,
      uploaderId: track.uploaderId,
      waveformJson: track.waveformJson,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    };

    if (streamUrl !== undefined) {
      response.streamUrl = streamUrl;
    }

    return response;
  }
}
