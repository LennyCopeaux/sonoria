import { Module } from '@nestjs/common';
import { RegistryModule } from '../registry/registry.module';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';

@Module({
  imports: [RegistryModule],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
