import { Injectable } from '@nestjs/common';
import { TrackStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePagination, totalPages } from '@sonoria/utils';
import { toPaginationParams } from '../common/pagination';

export interface SearchTrackResult {
  id: string;
  title: string;
  slug: string;
  genre: string | null;
  coverUrl: string | null;
  playCount: number;
  artistName: string | null;
}

export interface SearchArtistResult {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
}

export interface SearchResult {
  tracks: SearchTrackResult[];
  artists: SearchArtistResult[];
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
    type: 'track' | 'artist' | 'all' = 'track',
    page?: number,
    limit?: number,
  ): Promise<SearchResult> {
    const term = q.trim();
    const pagination = resolvePagination(toPaginationParams(page, limit));

    if (type === 'artist') {
      return this.searchArtists(term, pagination);
    }

    if (type === 'all') {
      const [tracks, artists] = await Promise.all([
        this.fetchTracks(term, pagination),
        this.fetchArtists(term, pagination),
      ]);

      return {
        tracks: tracks.items,
        artists: artists.items,
        total: tracks.total + artists.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: totalPages(
          tracks.total + artists.total,
          pagination.limit,
        ),
      };
    }

    return this.searchTracks(term, pagination);
  }

  private async searchTracks(
    term: string,
    pagination: ReturnType<typeof resolvePagination>,
  ): Promise<SearchResult> {
    const { items, total } = await this.fetchTracks(term, pagination);

    return {
      tracks: items,
      artists: [],
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: totalPages(total, pagination.limit),
    };
  }

  private async searchArtists(
    term: string,
    pagination: ReturnType<typeof resolvePagination>,
  ): Promise<SearchResult> {
    const { items, total } = await this.fetchArtists(term, pagination);

    return {
      tracks: [],
      artists: items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: totalPages(total, pagination.limit),
    };
  }

  private async fetchTracks(
    term: string,
    pagination: ReturnType<typeof resolvePagination>,
  ) {
    const where = {
      status: TrackStatus.READY,
      OR: [
        { title: { contains: term, mode: 'insensitive' as const } },
        { uploader: { name: { contains: term, mode: 'insensitive' as const } } },
      ],
    };

    const [rows, total] = await Promise.all([
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
          uploader: { select: { name: true } },
        },
      }),
      this.prisma.track.count({ where }),
    ]);

    return {
      items: rows.map((track) => ({
        id: track.id,
        title: track.title,
        slug: track.slug,
        genre: track.genre,
        coverUrl: track.coverUrl,
        playCount: track.playCount,
        artistName: track.uploader?.name ?? null,
      })),
      total,
    };
  }

  private async fetchArtists(
    term: string,
    pagination: ReturnType<typeof resolvePagination>,
  ) {
    const pattern = `%${term}%`;

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

    return {
      items: artistRows,
      total: Number(countRows[0]?.count ?? 0),
    };
  }
}
