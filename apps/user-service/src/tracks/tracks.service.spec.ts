import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, TrackStatus } from '@prisma/client';
import { TracksService } from './tracks.service';
import { JwtPayload } from '../auth/types';

const artistUser: JwtPayload = {
  sub: 'user-artist',
  email: 'artist@test.com',
  role: Role.ARTIST,
  jti: 'jti-1',
};

const visitorUser: JwtPayload = {
  sub: 'user-visitor',
  email: 'visitor@test.com',
  role: Role.USER,
  jti: 'jti-2',
};

const mockTrack = {
  id: 'track-1',
  title: 'Test Track',
  slug: 'test-track-abcd',
  genre: 'electro',
  tags: ['chill'],
  duration: null,
  audioUrl: null,
  coverUrl: null,
  s3KeyStd: null,
  s3KeyHq: null,
  waveformJson: null,
  status: TrackStatus.READY,
  playCount: 0,
  uploaderId: 'user-artist',
  artistProfileId: 'artist-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  track: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  artistProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUniqueOrThrow: vi.fn(),
  },
  listeningHistory: {
    create: vi.fn(),
  },
  like: {
    groupBy: vi.fn().mockResolvedValue([]),
    findMany: vi.fn().mockResolvedValue([]),
  },
  $transaction: vi.fn(),
};

const mockMediaClient = {
  getUploadUrl: vi.fn(),
  getStreamUrl: vi.fn(),
  deleteMedia: vi.fn(),
};

function buildService(): TracksService {
  return new TracksService(mockPrisma as never, mockMediaClient as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TracksService.findAll', () => {
  it('filters READY tracks for non-artist users', async () => {
    mockPrisma.track.findMany.mockResolvedValue([mockTrack]);
    mockPrisma.track.count.mockResolvedValue(1);

    const service = buildService();
    await service.findAll({}, visitorUser);

    const findManyArgs = mockPrisma.track.findMany.mock.calls[0]?.[0] as {
      where: { status: TrackStatus };
    };
    expect(findManyArgs.where.status).toBe(TrackStatus.READY);
  });
});

describe('TracksService.play', () => {
  it('increments playCount and creates history', async () => {
    mockPrisma.track.findUnique.mockResolvedValue(mockTrack);
    mockPrisma.$transaction.mockResolvedValue([{ ...mockTrack, playCount: 1 }]);

    const service = buildService();
    const result = await service.play('track-1', visitorUser);

    expect(result.playCount).toBe(1);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('rejects play on non-READY track', async () => {
    mockPrisma.track.findUnique.mockResolvedValue({
      ...mockTrack,
      status: TrackStatus.PENDING,
    });

    const service = buildService();
    await expect(service.play('track-1', visitorUser)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('TracksService.internalUpdate', () => {
  it('updates status and s3 keys', async () => {
    mockPrisma.track.findUnique.mockResolvedValue(mockTrack);
    mockPrisma.track.update.mockResolvedValue({
      ...mockTrack,
      status: TrackStatus.READY,
      s3KeyStd: 'tracks/track-1/std.mp3',
      s3KeyHq: 'tracks/track-1/hq.mp3',
    });

    const service = buildService();
    const result = await service.internalUpdate('track-1', {
      status: TrackStatus.READY,
      s3KeyStd: 'tracks/track-1/std.mp3',
      s3KeyHq: 'tracks/track-1/hq.mp3',
    });

    expect(result.status).toBe(TrackStatus.READY);
    expect(mockPrisma.track.update).toHaveBeenCalled();
  });
});

describe('TracksService.findOne', () => {
  it('hides non-READY track from visitors', async () => {
    mockPrisma.track.findUnique.mockResolvedValue({
      ...mockTrack,
      status: TrackStatus.PENDING,
    });

    const service = buildService();
    await expect(service.findOne('track-1', undefined)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('TracksService.create', () => {
  it('creates track and returns upload URL', async () => {
    mockPrisma.artistProfile.findUnique.mockResolvedValue({
      id: 'artist-1',
      userId: artistUser.sub,
      slug: 'artist',
    });
    mockPrisma.track.findUnique.mockResolvedValue(null);
    mockPrisma.track.create.mockResolvedValue({
      ...mockTrack,
      id: 'new-track',
    });
    mockMediaClient.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://minio/upload',
      key: 'tracks/new-track/original/file.mp3',
    });

    const service = buildService();
    const result = await service.create(artistUser, {
      title: 'New Song',
      filename: 'song.mp3',
      mimeType: 'audio/mpeg',
      tags: [],
    });

    expect(result.trackId).toBe('new-track');
    expect(result.uploadUrl).toBe('https://minio/upload');
  });
});
