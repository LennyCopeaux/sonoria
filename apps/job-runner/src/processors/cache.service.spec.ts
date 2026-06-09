import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis/redis.service';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let redis: jest.Mocked<Pick<RedisService, 'del'>>;

  beforeEach(async () => {
    redis = { del: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(CacheService);
  });

  it('deletes the cache key', async () => {
    await service.invalidate({ key: 'stream:url:track-1:std' });
    expect(redis.del).toHaveBeenCalledWith('stream:url:track-1:std');
  });

  it('ignores empty keys', async () => {
    await service.invalidate({ key: '  ' });
    expect(redis.del).not.toHaveBeenCalled();
  });
});
