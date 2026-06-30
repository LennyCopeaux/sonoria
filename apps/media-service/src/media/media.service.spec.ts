import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';

const mockS3 = {
  buildOriginalKey: jest.fn(),
  buildTranscodedKey: jest.fn(),
  createPresignedPutUrl: jest.fn(),
  createPresignedGetUrl: jest.fn(),
  objectExists: jest.fn(),
  deleteTrackObjects: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
};

const mockQueue = {
  enqueueTranscode: jest.fn(),
};

function buildService(): MediaService {
  return new MediaService(
    mockS3 as never,
    mockRedis as never,
    mockQueue as never,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MediaService.createUploadUrl', () => {
  it('returns presigned upload URL and key', async () => {
    mockS3.buildOriginalKey.mockReturnValue('tracks/t1/original/song.mp3');
    mockS3.createPresignedPutUrl.mockResolvedValue('https://minio/upload');

    const service = buildService();
    const result = await service.createUploadUrl({
      trackId: 't1',
      filename: 'song.mp3',
      mimeType: 'audio/mpeg',
    });

    expect(result.key).toBe('tracks/t1/original/song.mp3');
    expect(result.uploadUrl).toBe('https://minio/upload');
  });
});

describe('MediaService.confirmUpload', () => {
  it('queues transcode job when file exists', async () => {
    mockS3.objectExists.mockResolvedValue(true);

    const service = buildService();
    const result = await service.confirmUpload({
      trackId: 't1',
      s3Key: 'tracks/t1/original/song.mp3',
    });

    expect(result.status).toBe('queued');
    expect(mockQueue.enqueueTranscode).toHaveBeenCalledWith({
      trackId: 't1',
      s3Key: 'tracks/t1/original/song.mp3',
    });
  });

  it('throws when file is missing', async () => {
    mockS3.objectExists.mockResolvedValue(false);
    const service = buildService();
    await expect(
      service.confirmUpload({ trackId: 't1', s3Key: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('MediaService.getStreamUrl', () => {
  it('rejects hq for non-subscribers', async () => {
    const service = buildService();
    await expect(service.getStreamUrl('t1', 'hq', 'USER')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns cached stream URL', async () => {
    mockRedis.get.mockResolvedValue('https://cached/stream');

    const service = buildService();
    const result = await service.getStreamUrl('t1', 'std', 'USER');

    expect(result.streamUrl).toBe('https://cached/stream');
    expect(mockS3.createPresignedGetUrl).not.toHaveBeenCalled();
  });
});

describe('MediaService.deleteTrackMedia', () => {
  it('deletes s3 objects and cache keys', async () => {
    const service = buildService();
    await service.deleteTrackMedia('t1');

    expect(mockS3.deleteTrackObjects).toHaveBeenCalledWith('t1');
    expect(mockRedis.del).toHaveBeenCalledWith(
      'stream:url:t1:std',
      'stream:url:t1:hq',
    );
  });
});
