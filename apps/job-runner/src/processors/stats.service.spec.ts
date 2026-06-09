import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let prisma: {
    artistProfile: { findUnique: jest.Mock };
    track: { findMany: jest.Mock };
    listeningHistory: { count: jest.Mock; groupBy: jest.Mock };
    follow: { count: jest.Mock };
  };
  let redis: jest.Mocked<Pick<RedisService, 'setEx'>>;

  beforeEach(async () => {
    prisma = {
      artistProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'artist-1', userId: 'user-1' }),
      },
      track: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'track-1', title: 'Song A' },
          { id: 'track-2', title: 'Song B' },
        ]),
      },
      listeningHistory: {
        count: jest
          .fn()
          .mockResolvedValueOnce(100)
          .mockResolvedValueOnce(12),
        groupBy: jest.fn().mockResolvedValue([
          { trackId: 'track-1', _count: { trackId: 80 } },
        ]),
      },
      follow: { count: jest.fn().mockResolvedValue(5) },
    };

    redis = { setEx: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(StatsService);
  });

  it('aggregates stats and caches them in Redis', async () => {
    await service.aggregate({ artistId: 'artist-1' });

    expect(redis.setEx).toHaveBeenCalledWith(
      'artist:stats:artist-1',
      expect.stringContaining('"totalStreams":100'),
      3600,
    );

    const payload = JSON.parse(redis.setEx.mock.calls[0]![1] as string) as {
      streamsLast7Days: number;
      followersCount: number;
      topTracks: Array<{ trackId: string }>;
    };

    expect(payload.streamsLast7Days).toBe(12);
    expect(payload.followersCount).toBe(5);
    expect(payload.topTracks[0]?.trackId).toBe('track-1');
  });
});
