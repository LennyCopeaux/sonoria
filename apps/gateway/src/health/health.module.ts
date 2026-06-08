import { Module } from '@nestjs/common';
import { RegistryModule } from '../registry/registry.module';
import { HealthController } from './health.controller';

@Module({
  imports: [RegistryModule],
  controllers: [HealthController],
})
export class HealthModule {}
