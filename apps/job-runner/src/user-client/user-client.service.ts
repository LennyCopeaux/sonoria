import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InternalTrackUpdatePayload } from './internal-track.types';

@Injectable()
export class UserClientService {
  constructor(private readonly config: ConfigService) {}

  async updateTrackInternal(
    trackId: string,
    payload: InternalTrackUpdatePayload,
  ): Promise<void> {
    const baseUrl = this.config.getOrThrow<string>('USER_SERVICE_URL');
    const token = this.config.getOrThrow<string>('INTERNAL_API_TOKEN');

    await axios.patch(`${baseUrl}/tracks/${trackId}/internal`, payload, {
      headers: { 'x-internal-token': token },
    });
  }
}
