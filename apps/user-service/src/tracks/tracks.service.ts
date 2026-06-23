import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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
  artistName: string | null;
  waveformJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  streamUrl?: string;
  likeCount: number;
  likedByMe?: boolean;
}

// The uploader's display name is the artist label shown in the UI; it is
// loaded via an optional relation so callers that don't need it stay cheap.
type TrackWithUploader = Track & { uploader?: { name: string } | null };

const UPLOADER_SELECT = {
  uploader: { select: { name: true } },
} as const;

@Injectable()
export class TracksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaClient: MediaClientService,
  ) {}

  async create(
    user: JwtPayload,
    dto: CreateTrackDto,
  ): Promise<{ trackId: string; uploadUrl: string; s3Key: string }> {
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

    try {
      const { uploadUrl, key } = await this.mediaClient.getUploadUrl(
        track.id,
        dto.filename,
        dto.mimeType,
      );

      return { trackId: track.id, uploadUrl, s3Key: key };
    } catch {
      await this.prisma.track.delete({ where: { id: track.id } }).catch(() => undefined);
      throw new ServiceUnavailableException(
        'Service média indisponible. Lancez media-service (port 3004), MinIO et Redis.',
      );
    }
  }

  async confirmUpload(
    id: string,
    user: JwtPayload,
    s3Key: string,
  ): Promise<{ status: 'queued' }> {
    const track = await this.findTrackOrThrow(id);
    this.assertOwner(track, user);

    const result = await this.mediaClient.confirmUpload(id, s3Key);

    await this.prisma.track.update({
      where: { id },
      data: { status: TrackStatus.READY },
    });

    return result;
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
        include: UPLOADER_SELECT,
      }),
      this.prisma.track.count({ where }),
    ]);

    const trackIds = tracks.map((t) => t.id);
    const likeCounts = await this.getLikeCounts(trackIds);
    const likedByUser = await this.getLikedByUser(user?.sub, trackIds);

    return {
      items: tracks.map((t) => {
        const likeMeta: { likeCount: number; likedByMe?: boolean } = {
          likeCount: likeCounts.get(t.id) ?? 0,
        };
        if (user) {
          likeMeta.likedByMe = likedByUser.has(t.id);
        }
        return this.toResponse(t, undefined, likeMeta);
      }),
      total,
      page,
      limit,
      totalPages: totalPages(total, limit),
    };
  }

  async findOne(id: string, user?: JwtPayload): Promise<TrackResponse> {
    const track = await this.findTrackOrThrow(id);
    this.assertCanView(track, user);

    const likeMeta = await this.getLikeMeta(track.id, user?.sub);

    if (track.status === TrackStatus.READY) {
      const quality = user?.role === Role.SUBSCRIBER ? 'hq' : 'std';
      const streamUrl = await this.mediaClient.getStreamUrl(
        track.id,
        quality,
        user?.role ?? Role.VISITOR,
      );
      return this.toResponse(track, streamUrl, likeMeta);
    }

    return this.toResponse(track, undefined, likeMeta);
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
      include: UPLOADER_SELECT,
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
      include: UPLOADER_SELECT,
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
    return this.findAll({ ...query, artistId: artistProfileId }, user);
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

  private async findTrackOrThrow(id: string): Promise<TrackWithUploader> {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: UPLOADER_SELECT,
    });
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

    if (user.role === Role.ADMIN || track.uploaderId === user.sub) {
      return;
    }

    throw new NotFoundException('Track not found');
  }

  private async getLikeMeta(
    trackId: string,
    userId?: string,
  ): Promise<{ likeCount: number; likedByMe?: boolean }> {
    const [likeCount, userLike] = await Promise.all([
      this.prisma.like.count({ where: { trackId } }),
      userId
        ? this.prisma.like.findUnique({
            where: { userId_trackId: { userId, trackId } },
          })
        : Promise.resolve(null),
    ]);

    const meta: { likeCount: number; likedByMe?: boolean } = { likeCount };
    if (userId) {
      meta.likedByMe = userLike !== null;
    }
    return meta;
  }

  private async getLikeCounts(
    trackIds: string[],
  ): Promise<Map<string, number>> {
    if (trackIds.length === 0) return new Map();

    const rows = await this.prisma.like.groupBy({
      by: ['trackId'],
      where: { trackId: { in: trackIds } },
      _count: { trackId: true },
    });

    return new Map(rows.map((r) => [r.trackId, r._count.trackId]));
  }

  private async getLikedByUser(
    userId: string | undefined,
    trackIds: string[],
  ): Promise<Set<string>> {
    if (!userId || trackIds.length === 0) return new Set();

    const likes = await this.prisma.like.findMany({
      where: { userId, trackId: { in: trackIds } },
      select: { trackId: true },
    });

    return new Set(likes.map((l) => l.trackId));
  }

  private toResponse(
    track: TrackWithUploader,
    streamUrl?: string,
    likeMeta?: { likeCount: number; likedByMe?: boolean },
  ): TrackResponse {
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
      artistName: track.uploader?.name ?? null,
      waveformJson: track.waveformJson,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
      likeCount: likeMeta?.likeCount ?? 0,
    };

    if (streamUrl !== undefined) {
      response.streamUrl = streamUrl;
    }

    if (likeMeta?.likedByMe !== undefined) {
      response.likedByMe = likeMeta.likedByMe;
    }

    return response;
  }
}
