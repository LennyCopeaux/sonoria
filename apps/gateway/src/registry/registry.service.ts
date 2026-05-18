import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import type {
  RegisterServiceDto,
  RegistryEntry,
} from './dto/register-service.dto';

const KEY_PREFIX = 'registry:';
const TTL_SECONDS = 30;

@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async register(dto: RegisterServiceDto): Promise<RegistryEntry> {
    const entry: RegistryEntry = {
      ...dto,
      status: 'UP',
      registeredAt: new Date().toISOString(),
    };
    await this.redis.set(
      KEY_PREFIX + dto.name,
      JSON.stringify(entry),
      'EX',
      TTL_SECONDS,
    );
    this.logger.log(`Registered ${dto.name} → ${dto.internalUrl}`);
    return entry;
  }

  async heartbeat(name: string): Promise<{ name: string; ttl: number }> {
    const key = KEY_PREFIX + name;
    const exists = await this.redis.exists(key);
    if (!exists) throw new NotFoundException(`Service ${name} not registered`);
    await this.redis.expire(key, TTL_SECONDS);
    return { name, ttl: TTL_SECONDS };
  }

  async getAll(): Promise<RegistryEntry[]> {
    const keys = await this.redis.keys(KEY_PREFIX + '*');
    if (keys.length === 0) return [];
    const values = await this.redis.mget(...keys);
    return values
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v) as RegistryEntry);
  }

  async resolve(path: string): Promise<RegistryEntry | null> {
    const services = await this.getAll();
    for (const svc of services) {
      if (svc.status !== 'UP') continue;
      if (
        svc.routes.some(
          (prefix) => path === prefix || path.startsWith(prefix + '/'),
        )
      ) {
        return svc;
      }
    }
    return null;
  }
}
