import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  onModuleInit() {
    this.logger.log('Job runner online — workers will be registered here.');
  }

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'job-runner' };
  }
}
