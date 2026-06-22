import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  const redis = { get: vi.fn() };
  const prisma = { track: { findMany: vi.fn() } };
  const queue = { enqueueRecoRefresh: vi.fn() };
  let service: RecommendationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecommendationsService(
      redis as never,
      prisma as never,
      queue as never,
    );
  });

  it('always enqueues a reco:refresh job', async () => {
    redis.get.mockResolvedValue(null);
    prisma.track.findMany.mockResolvedValue([]);

    await service.getForUser('user-1');

    expect(queue.enqueueRecoRefresh).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  it('returns personalized tracks in cached order on cache hit', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({
        userId: 'user-1',
        trackIds: ['track-2', 'track-1'],
        computedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    prisma.track.findMany.mockResolvedValue([
      {
        id: 'track-1',
        title: 'One',
        slug: 'one',
        genre: null,
        duration: null,
        coverUrl: null,
        playCount: 1,
        artistProfileId: null,
      },
      {
        id: 'track-2',
        title: 'Two',
        slug: 'two',
        genre: null,
        duration: null,
        coverUrl: null,
        playCount: 2,
        artistProfileId: null,
      },
    ]);

    const result = await service.getForUser('user-1');

    expect(result.source).toBe('personalized');
    expect(result.tracks.map((t) => t.id)).toEqual(['track-2', 'track-1']);
  });

  it('falls back to trending when there is no cache', async () => {
    redis.get.mockResolvedValue(null);
    prisma.track.findMany.mockResolvedValue([
      {
        id: 'pop-1',
        title: 'Pop',
        slug: 'pop',
        genre: null,
        duration: null,
        coverUrl: null,
        playCount: 99,
        artistProfileId: null,
      },
    ]);

    const result = await service.getForUser('user-1');

    expect(result.source).toBe('trending');
    expect(result.tracks).toHaveLength(1);
  });

  it('falls back to trending when the cache references no live tracks', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({
        userId: 'user-1',
        trackIds: ['gone'],
        computedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    // First call (personalized lookup) returns nothing, second (trending) returns one.
    prisma.track.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'pop-1',
        title: 'Pop',
        slug: 'pop',
        genre: null,
        duration: null,
        coverUrl: null,
        playCount: 99,
        artistProfileId: null,
      },
    ]);

    const result = await service.getForUser('user-1');

    expect(result.source).toBe('trending');
  });
});
