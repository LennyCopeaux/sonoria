import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Role } from '@prisma/client';

interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
}

interface StreamUrlResponse {
  streamUrl: string;
}

@Injectable()
export class MediaClientService {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return this.config.getOrThrow<string>('MEDIA_SERVICE_URL');
  }

  async getUploadUrl(
    trackId: string,
    filename: string,
    mimeType: string,
  ): Promise<UploadUrlResponse> {
    const { data } = await axios.post<UploadUrlResponse>(
      `${this.baseUrl()}/media/upload-url`,
      { trackId, filename, mimeType },
    );
    return data;
  }

  async getStreamUrl(
    trackId: string,
    quality: 'std' | 'hq',
    userRole: Role,
  ): Promise<string> {
    const { data } = await axios.get<StreamUrlResponse>(
      `${this.baseUrl()}/media/stream/${trackId}`,
      {
        params: { quality },
        headers: { 'x-user-role': userRole },
      },
    );
    return data.streamUrl;
  }

  async deleteMedia(trackId: string): Promise<void> {
    await axios.delete(`${this.baseUrl()}/media/${trackId}`);
  }
}
