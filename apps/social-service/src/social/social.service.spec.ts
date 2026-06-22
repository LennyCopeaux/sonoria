import { NotFoundException } from '@nestjs/common';
import { LikesService } from './social.service';

const mockPrisma = {
  track: { findUnique: jest.fn() },
  like: { upsert: jest.fn(), count: jest.fn(), deleteMany: jest.fn() },
};

function buildService(): LikesService {
  return new LikesService(mockPrisma as never);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LikesService.likeTrack', () => {
  it('upserts a like and returns the updated count', async () => {
    mockPrisma.track.findUnique.mockResolvedValue({ id: 't1' });
    mockPrisma.like.upsert.mockResolvedValue({});
    mockPrisma.like.count.mockResolvedValue(3);

    const result = await buildService().likeTrack('u1', 't1');

    expect(mockPrisma.like.upsert).toHaveBeenCalledWith({
      where: { userId_trackId: { userId: 'u1', trackId: 't1' } },
      create: { userId: 'u1', trackId: 't1' },
      update: {},
    });
    expect(result).toEqual({ liked: true, count: 3 });
  });

  it('throws when the track does not exist', async () => {
    mockPrisma.track.findUnique.mockResolvedValue(null);

    await expect(
      buildService().likeTrack('u1', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('LikesService.unlikeTrack', () => {
  it('removes the like and returns the updated count', async () => {
    mockPrisma.track.findUnique.mockResolvedValue({ id: 't1' });
    mockPrisma.like.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.like.count.mockResolvedValue(2);

    const result = await buildService().unlikeTrack('u1', 't1');

    expect(mockPrisma.like.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', trackId: 't1' },
    });
    expect(result).toEqual({ liked: false, count: 2 });
  });
});
