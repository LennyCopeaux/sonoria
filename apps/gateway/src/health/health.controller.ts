import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import axios from 'axios';
import { Public } from '../auth/public.decorator';
import { RegistryService } from '../registry/registry.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly registry: RegistryService) {}

  @Public()
  @Get()
  async check() {
    const services = await this.registry.getAll();
    const probes = await Promise.all(
      services.map(async (svc) => {
        try {
          const res = await axios.get(svc.healthUrl, { timeout: 2_000 });
          return { name: svc.name, status: res.status === 200 ? 'UP' : 'DOWN' };
        } catch {
          return { name: svc.name, status: 'DOWN' as const };
        }
      }),
    );
    const allUp = probes.every((p) => p.status === 'UP');
    return {
      status:
        allUp && probes.length > 0
          ? 'UP'
          : probes.length === 0
            ? 'EMPTY'
            : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: probes,
    };
  }
}
