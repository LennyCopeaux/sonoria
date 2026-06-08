import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  onModuleInit() {
    this.logger.log('Job runner online — processors will be registered next.');
  }

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'job-runner' };
  }
}
