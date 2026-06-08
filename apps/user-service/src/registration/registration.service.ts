import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class RegistrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RegistrationService.name);
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.registerWithRetry();
    this.heartbeatInterval = setInterval(() => {
      void this.heartbeat();
    }, 15_000);
  }

  onModuleDestroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  private async registerWithRetry(): Promise<void> {
    const delays = [2000, 4000, 8000, 16000, 32000];
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        await this.register();
        this.logger.log('Registered with gateway successfully');
        return;
      } catch (err) {
        if (attempt < delays.length) {
          const delay = delays[attempt] ?? 2000;
          this.logger.warn(
            `Registration failed (attempt ${attempt + 1}), retrying in ${delay}ms...`,
          );
          await sleep(delay);
        } else {
          this.logger.error('All registration attempts failed', err);
        }
      }
    }
  }

  private serviceBaseUrl(): string {
    return (
      this.config.get<string>('USER_SERVICE_INTERNAL_URL') ??
      'http://user-service:3001'
    );
  }

  private async register(): Promise<void> {
    const gatewayUrl = this.config.getOrThrow<string>('GATEWAY_URL');
    const baseUrl = this.serviceBaseUrl();
    await axios.post(`${gatewayUrl}/registry/register`, {
      name: 'user-service',
      internalUrl: baseUrl,
      routes: [
        '/auth',
        '/users',
        '/artists',
        '/tracks',
        '/playlists',
        '/search',
        '/notifications',
        '/subscription',
        '/stats',
        '/recommendations',
      ],
      healthUrl: `${baseUrl}/health`,
    });
  }

  private async heartbeat(): Promise<void> {
    try {
      const gatewayUrl = this.config.getOrThrow<string>('GATEWAY_URL');
      await axios.put(`${gatewayUrl}/registry/heartbeat/user-service`);
    } catch {
      this.logger.warn('Heartbeat failed, attempting re-registration...');
      await this.register().catch((err: unknown) => {
        this.logger.error('Re-registration failed', err);
      });
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
