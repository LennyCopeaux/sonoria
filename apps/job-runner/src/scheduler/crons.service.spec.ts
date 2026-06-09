import { Test, TestingModule } from '@nestjs/testing';
import { QueuePublisherService } from '../queue/queue-publisher.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CronsService } from './crons.service';

describe('CronsService', () => {
  let service: CronsService;
  let redis: jest.Mocked<Pick<RedisService, 'setNx'>>;
  let queuePublisher: jest.Mocked<
    Pick<QueuePublisherService, 'enqueueStats' | 'enqueueReco'>
  >;
  let prisma: {
    artistProfile: { findMany: jest.Mock };
    listeningHistory: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    redis = { setNx: jest.fn().mockResolvedValue(true) };
    queuePublisher = {
      enqueueStats: jest.fn().mockResolvedValue(undefined),
      enqueueReco: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      artistProfile: {
        findMany: jest.fn().mockResolvedValue([{ id: 'artist-1' }]),
      },
      listeningHistory: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: QueuePublisherService, useValue: queuePublisher },
      ],
    }).compile();

    service = module.get(CronsService);
  });

  it('skips stats cron when lock is not acquired', async () => {
    redis.setNx.mockResolvedValueOnce(false);

    await service.enqueueArtistStats();

    expect(queuePublisher.enqueueStats).not.toHaveBeenCalled();
  });

  it('enqueues stats jobs when lock is acquired', async () => {
    await service.enqueueArtistStats();

    expect(queuePublisher.enqueueStats).toHaveBeenCalledWith({
      artistId: 'artist-1',
    });
  });

  it('enqueues reco jobs for active users', async () => {
    await service.enqueueUserRecommendations();

    expect(queuePublisher.enqueueReco).toHaveBeenCalledWith({
      userId: 'user-1',
    });
  });
});
