import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Redis } from 'ioredis';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { REDIS_CLIENT } from '../redis/redis.module';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  jti?: string;
}

interface WhitelistRule {
  method: string;
  prefix: string;
}

const WHITELIST: WhitelistRule[] = [
  { method: 'POST', prefix: '/auth/' },
  { method: 'GET', prefix: '/health' },
  { method: 'GET', prefix: '/docs' },
];

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly publicKey: string;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    const base64 = config.get<string>('JWT_PUBLIC_KEY', '');
    this.publicKey = base64
      ? Buffer.from(base64, 'base64').toString('utf8')
      : '';
    if (!this.publicKey) {
      this.logger.warn(
        'JWT_PUBLIC_KEY not set — all non-public routes will reject',
      );
    }
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (this.isWhitelisted(req)) return true;

    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');
    if (!this.publicKey)
      throw new UnauthorizedException('Gateway not configured');

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (payload.jti) {
      const blacklisted = await this.redis.exists(
        `auth:blacklist:${payload.jti}`,
      );
      if (blacklisted) throw new UnauthorizedException('Token revoked');
    }

    req.user = {
      sub: String(payload.sub ?? ''),
      email: String(payload.email ?? ''),
      role: String(payload.role ?? 'USER'),
      jti: payload.jti,
    };
    return true;
  }

  private isWhitelisted(req: Request): boolean {
    const method = req.method.toUpperCase();
    const path = req.path;
    return WHITELIST.some(
      (r) => r.method === method && path.startsWith(r.prefix),
    );
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
  }
}
