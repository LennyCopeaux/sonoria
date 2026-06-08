import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { UploadUrlDto } from './dto/upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

const STREAM_CACHE_TTL = 3300;
const STREAM_URL_TTL = 3600;
const UPLOAD_URL_TTL = 900;

@Injectable()
export class MediaService {
  constructor(
    private readonly s3: S3Service,
    private readonly redis: RedisService,
    private readonly queue: QueueService,
  ) {}

  async createUploadUrl(
    dto: UploadUrlDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    const key = this.s3.buildOriginalKey(dto.trackId, dto.filename);
    const uploadUrl = await this.s3.createPresignedPutUrl(
      key,
      dto.mimeType,
      UPLOAD_URL_TTL,
    );
    return { uploadUrl, key };
  }

  async confirmUpload(dto: ConfirmUploadDto): Promise<{ status: 'queued' }> {
    const exists = await this.s3.objectExists(dto.s3Key);
    if (!exists) {
      throw new NotFoundException('Uploaded file not found in storage');
    }

    await this.queue.enqueueTranscode({
      trackId: dto.trackId,
      s3Key: dto.s3Key,
    });

    return { status: 'queued' };
  }

  async getStreamUrl(
    trackId: string,
    quality: 'std' | 'hq',
    userRole: string | undefined,
  ): Promise<{ streamUrl: string }> {
    if (quality === 'hq' && userRole !== 'SUBSCRIBER') {
      throw new ForbiddenException('HQ stream requires SUBSCRIBER role');
    }

    const cacheKey = `stream:url:${trackId}:${quality}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { streamUrl: cached };
    }

    const key = this.s3.buildTranscodedKey(trackId, quality);
    const exists = await this.s3.objectExists(key);
    if (!exists) {
      throw new NotFoundException('Stream not available for this track');
    }

    const streamUrl = await this.s3.createPresignedGetUrl(key, STREAM_URL_TTL);
    await this.redis.setEx(cacheKey, streamUrl, STREAM_CACHE_TTL);

    return { streamUrl };
  }

  async deleteTrackMedia(trackId: string): Promise<void> {
    if (!trackId.trim()) {
      throw new BadRequestException('Invalid track id');
    }

    await this.s3.deleteTrackObjects(trackId);
    await this.redis.del(
      `stream:url:${trackId}:std`,
      `stream:url:${trackId}:hq`,
    );
  }
}
