import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { TrackStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from '../s3/s3.service';
import { UserClientService } from '../user-client/user-client.service';
import { TranscodeService } from './transcode.service';

jest.mock('node:child_process', () => {
  const actual =
    jest.requireActual<typeof import('node:child_process')>(
      'node:child_process',
    );
  return {
    ...actual,
    spawn: jest.fn(),
  };
});

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

function createMockFfmpegProcess(stdout?: Buffer): EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
} {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();

  setImmediate(() => {
    if (stdout) {
      proc.stdout.emit('data', stdout);
    }
    proc.emit('close', 0);
  });

  return proc;
}

describe('TranscodeService', () => {
  let service: TranscodeService;
  let s3: jest.Mocked<
    Pick<S3Service, 'downloadToFile' | 'uploadFile' | 'buildTranscodedKey'>
  >;
  let userClient: jest.Mocked<Pick<UserClientService, 'updateTrackInternal'>>;

  beforeEach(async () => {
    s3 = {
      downloadToFile: jest.fn().mockResolvedValue(undefined),
      uploadFile: jest.fn().mockResolvedValue(undefined),
      buildTranscodedKey: jest
        .fn()
        .mockImplementation(
          (trackId: string, quality: 'std' | 'hq') =>
            `tracks/${trackId}/${quality}.mp3`,
        ),
    };

    userClient = {
      updateTrackInternal: jest.fn().mockResolvedValue(undefined),
    };

    mockSpawn.mockImplementation((_cmd, args) => {
      const isWaveform = args.includes('pipe:1');
      const pcm = Buffer.alloc(3200);
      pcm.writeInt16LE(16000, 0);
      return createMockFfmpegProcess(
        isWaveform ? pcm : undefined,
      ) as ReturnType<typeof spawn>;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscodeService,
        { provide: S3Service, useValue: s3 },
        { provide: UserClientService, useValue: userClient },
      ],
    }).compile();

    service = module.get(TranscodeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('transcodes audio and marks track READY', async () => {
    await service.processJob({
      trackId: 'track-1',
      s3Key: 'tracks/track-1/original.wav',
    });

    expect(userClient.updateTrackInternal).toHaveBeenNthCalledWith(
      1,
      'track-1',
      {
        status: TrackStatus.PROCESSING,
      },
    );

    expect(s3.downloadToFile).toHaveBeenCalledWith(
      'tracks/track-1/original.wav',
      expect.stringContaining('track-1_original.wav'),
    );

    expect(s3.uploadFile).toHaveBeenCalledTimes(2);
    expect(s3.uploadFile).toHaveBeenCalledWith(
      'tracks/track-1/std.mp3',
      expect.stringContaining('track-1_std.mp3'),
      'audio/mpeg',
    );
    expect(s3.uploadFile).toHaveBeenCalledWith(
      'tracks/track-1/hq.mp3',
      expect.stringContaining('track-1_hq.mp3'),
      'audio/mpeg',
    );

    const readyCall = userClient.updateTrackInternal.mock.calls.at(-1);
    expect(readyCall).toEqual([
      'track-1',
      {
        status: TrackStatus.READY,
        s3KeyStd: 'tracks/track-1/std.mp3',
        s3KeyHq: 'tracks/track-1/hq.mp3',
        waveformJson: expect.any(Array) as number[],
      },
    ]);

    expect(mockSpawn).toHaveBeenCalledTimes(3);
  });

  it('marks track ERROR when ffmpeg fails', async () => {
    mockSpawn.mockImplementation(() => {
      const proc = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
      };
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();
      setImmediate(() => {
        proc.emit('close', 1);
      });
      return proc as ReturnType<typeof spawn>;
    });

    await expect(
      service.processJob({
        trackId: 'track-2',
        s3Key: 'tracks/track-2/original.mp3',
      }),
    ).rejects.toThrow(/ffmpeg exited with code 1/);

    expect(userClient.updateTrackInternal).toHaveBeenLastCalledWith('track-2', {
      status: TrackStatus.ERROR,
    });
  });
});
