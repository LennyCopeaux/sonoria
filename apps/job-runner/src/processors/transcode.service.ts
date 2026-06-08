import { Injectable, Logger } from '@nestjs/common';
import { TrackStatus } from '@prisma/client';
import { spawn } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { getFfmpegPath } from '../ffmpeg/ffmpeg.config';
import { S3Service } from '../s3/s3.service';
import { UserClientService } from '../user-client/user-client.service';

export interface TranscodeJobData {
  trackId: string;
  s3Key: string;
}

const WAVEFORM_SAMPLES = 200;

@Injectable()
export class TranscodeService {
  private readonly logger = new Logger(TranscodeService.name);

  constructor(
    private readonly s3: S3Service,
    private readonly userClient: UserClientService,
  ) {}

  async processJob(data: TranscodeJobData): Promise<void> {
    const { trackId, s3Key } = data;
    const extension = extname(s3Key) || '.audio';
    const originalPath = join(tmpdir(), `${trackId}_original${extension}`);
    const stdPath = join(tmpdir(), `${trackId}_std.mp3`);
    const hqPath = join(tmpdir(), `${trackId}_hq.mp3`);

    try {
      await this.userClient.updateTrackInternal(trackId, {
        status: TrackStatus.PROCESSING,
      });

      await this.s3.downloadToFile(s3Key, originalPath);
      await this.encodeMp3(originalPath, stdPath, '128k');
      await this.encodeMp3(originalPath, hqPath, '320k');

      const waveformJson = await this.generateWaveform(originalPath);
      const s3KeyStd = this.s3.buildTranscodedKey(trackId, 'std');
      const s3KeyHq = this.s3.buildTranscodedKey(trackId, 'hq');

      await this.s3.uploadFile(s3KeyStd, stdPath, 'audio/mpeg');
      await this.s3.uploadFile(s3KeyHq, hqPath, 'audio/mpeg');

      await this.userClient.updateTrackInternal(trackId, {
        status: TrackStatus.READY,
        s3KeyStd,
        s3KeyHq,
        waveformJson,
      });

      this.logger.log(`Transcode completed for track ${trackId}`);
    } catch (error) {
      this.logger.error(`Transcode failed for track ${trackId}`, error);
      await this.userClient
        .updateTrackInternal(trackId, { status: TrackStatus.ERROR })
        .catch((patchError: unknown) => {
          this.logger.error(
            `Failed to mark track ${trackId} as ERROR`,
            patchError,
          );
        });
      throw error;
    } finally {
      await this.cleanupTempFiles([originalPath, stdPath, hqPath]);
    }
  }

  private async encodeMp3(
    inputPath: string,
    outputPath: string,
    bitrate: string,
  ): Promise<void> {
    await this.runFfmpeg([
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-b:a',
      bitrate,
      outputPath,
    ]);
  }

  private async generateWaveform(inputPath: string): Promise<number[]> {
    const pcm = await this.extractMonoPcm(inputPath);
    const sampleCount = pcm.length / 2;
    const chunkSize = Math.max(1, Math.floor(sampleCount / WAVEFORM_SAMPLES));
    const waveform: number[] = [];

    for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
      let peak = 0;
      const start = i * chunkSize;

      for (let j = 0; j < chunkSize; j++) {
        const index = start + j;
        if (index >= sampleCount) break;

        const sample = pcm.readInt16LE(index * 2);
        peak = Math.max(peak, Math.abs(sample));
      }

      waveform.push(Number(Math.min(1, peak / 32768).toFixed(4)));
    }

    return waveform;
  }

  private async extractMonoPcm(inputPath: string): Promise<Buffer> {
    return this.runFfmpegBuffer([
      '-i',
      inputPath,
      '-ac',
      '1',
      '-ar',
      '8000',
      '-f',
      's16le',
      'pipe:1',
    ]);
  }

  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(getFfmpegPath(), args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let stderr = '';

      ffmpeg.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      ffmpeg.on('error', reject);
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
      });
    });
  }

  private runFfmpegBuffer(args: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(getFfmpegPath(), args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const chunks: Buffer[] = [];
      let stderr = '';

      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      ffmpeg.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      ffmpeg.on('error', reject);
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
          return;
        }
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
      });
    });
  }

  private async cleanupTempFiles(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map((filePath) => unlink(filePath).catch(() => undefined)),
    );
  }
}
