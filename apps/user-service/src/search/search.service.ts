import { Injectable } from '@nestjs/common';
import { TrackStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePagination, totalPages } from '@sonoria/utils';
import { toPaginationParams } from '../common/pagination';

export interface SearchResult {
  tracks: Array<{
    id: string;
    title: string;
    slug: string;
    genre: string | null;
    coverUrl: string | null;
    playCount: number;
  }>;
  artists: Array<{
    id: string;
    slug: string;
    name: string;
    avatarUrl: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    q: string,
    type: 'track' | 'artist' = 'track',
    page?: number,
    limit?: number,
  ): Promise<SearchResult> {
    const pagination = resolvePagination(toPaginationParams(page, limit));
    const pattern = `%${q.trim()}%`;

    if (type === 'track') {
      const where = {
        status: TrackStatus.READY,
        title: { contains: q.trim(), mode: 'insensitive' as const },
      };

      const [tracks, total] = await Promise.all([
        this.prisma.track.findMany({
          where,
          skip: pagination.offset,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            genre: true,
            coverUrl: true,
            playCount: true,
          },
        }),
        this.prisma.track.count({ where }),
      ]);

      return {
        tracks,
        artists: [],
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: totalPages(total, pagination.limit),
      };
    }

    const artistRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        name: string;
        avatarUrl: string | null;
      }>
    >`
      SELECT ap.id, ap.slug, u.name, u."avatarUrl"
      FROM "ArtistProfile" ap
      INNER JOIN "User" u ON u.id = ap."userId"
      WHERE u.name ILIKE ${pattern} OR ap.slug ILIKE ${pattern}
      ORDER BY u.name ASC
      LIMIT ${pagination.limit}
      OFFSET ${pagination.offset}
    `;

    const countRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "ArtistProfile" ap
      INNER JOIN "User" u ON u.id = ap."userId"
      WHERE u.name ILIKE ${pattern} OR ap.slug ILIKE ${pattern}
    `;

    const total = Number(countRows[0]?.count ?? 0);

    return {
      tracks: [],
      artists: artistRows,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: totalPages(total, pagination.limit),
    };
  }
}
