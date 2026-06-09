import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  const redis = { get: vi.fn() };
  let service: RecommendationsService;

  beforeEach(() => {
    service = new RecommendationsService(redis as never);
    redis.get.mockResolvedValue(
      JSON.stringify({
        userId: 'user-1',
        trackIds: ['track-1'],
        computedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
  });

  it('returns cached recommendations', async () => {
    const reco = await service.getForUser('user-1');

    expect(reco.trackIds).toEqual(['track-1']);
    expect(redis.get).toHaveBeenCalledWith('reco:user-1');
  });

  it('throws when cache is empty', async () => {
    redis.get.mockResolvedValueOnce(null);

    await expect(service.getForUser('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
