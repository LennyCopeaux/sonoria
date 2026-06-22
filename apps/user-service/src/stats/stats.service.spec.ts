import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  const redis = { get: vi.fn() };
  const prisma = { artistProfile: { findUnique: vi.fn() } };
  let service: StatsService;

  beforeEach(() => {
    service = new StatsService(redis as never, prisma as never);
    prisma.artistProfile.findUnique.mockResolvedValue({
      id: 'artist-1',
      userId: 'user-1',
    });
    redis.get.mockResolvedValue(
      JSON.stringify({
        artistId: 'artist-1',
        totalStreams: 10,
        streamsLast7Days: 2,
        followersCount: 1,
        topTracks: [],
        computedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
  });

  it('returns cached artist stats', async () => {
    const stats = await service.getArtistStats('artist-1', {
      sub: 'user-1',
      email: 'a@test.com',
      role: Role.ARTIST,
      jti: 'jti-1',
    });

    expect(stats.totalStreams).toBe(10);
    expect(redis.get).toHaveBeenCalledWith('artist:stats:artist-1');
  });

  it('throws when cache is empty', async () => {
    redis.get.mockResolvedValueOnce(null);

    await expect(service.getArtistStats('artist-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
