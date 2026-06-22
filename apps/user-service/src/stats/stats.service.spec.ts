import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  const redis = { get: vi.fn() };
  const prisma = {
    artistProfile: { findUnique: vi.fn() },
    track: { findMany: vi.fn() },
    listeningHistory: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    follow: { count: vi.fn() },
  };
  const queue = { enqueueStatsAggregate: vi.fn() };
  let service: StatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StatsService(redis as never, prisma as never, queue as never);
    prisma.artistProfile.findUnique.mockResolvedValue({ id: 'artist-1' });
  });

  it('throws when the artist profile does not exist', async () => {
    prisma.artistProfile.findUnique.mockResolvedValueOnce(null);

    await expect(service.getArtistStats('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns cached stats without recomputing', async () => {
    const cached = {
      totalStreams: 42,
      streamsLast7Days: [{ date: '2026-06-22', count: 5 }],
      topTracks: [],
      followersCount: 3,
    };
    redis.get.mockResolvedValueOnce(JSON.stringify(cached));

    const stats = await service.getArtistStats('artist-1');

    expect(stats).toEqual(cached);
    expect(redis.get).toHaveBeenCalledWith('artist:stats:artist-1');
    expect(prisma.track.findMany).not.toHaveBeenCalled();
    expect(queue.enqueueStatsAggregate).not.toHaveBeenCalled();
  });

  it('computes from Prisma and enqueues a job on cache miss', async () => {
    redis.get.mockResolvedValueOnce(null);
    prisma.track.findMany.mockResolvedValue([
      { id: 'track-1', title: 'Song One' },
    ]);
    prisma.listeningHistory.count.mockResolvedValue(10);
    prisma.follow.count.mockResolvedValue(7);
    prisma.listeningHistory.findMany.mockResolvedValue([
      { listenedAt: new Date() },
      { listenedAt: new Date() },
    ]);
    prisma.listeningHistory.groupBy.mockResolvedValue([
      { trackId: 'track-1', _count: { trackId: 10 } },
    ]);

    const stats = await service.getArtistStats('artist-1');

    expect(stats.totalStreams).toBe(10);
    expect(stats.followersCount).toBe(7);
    expect(stats.streamsLast7Days).toHaveLength(7);
    expect(stats.streamsLast7Days.reduce((acc, d) => acc + d.count, 0)).toBe(2);
    expect(stats.topTracks).toEqual([
      { trackId: 'track-1', title: 'Song One', streams: 10 },
    ]);
    expect(queue.enqueueStatsAggregate).toHaveBeenCalledWith({
      artistId: 'artist-1',
    });
  });
});
