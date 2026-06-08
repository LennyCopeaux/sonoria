import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../auth/types';
import { Role } from '@prisma/client';

const AUTH_WHITELIST = [
  '/auth/register',
  '/auth/login',
  '/auth/refresh',
  '/health',
];

interface RequestWithUser extends Request {
  user?: JwtPayload | undefined;
}

/**
 * Reads gateway-injected identity headers and populates req.user.
 * Routes on the whitelist are skipped.
 */
@Injectable()
export class GatewayIdentityMiddleware implements NestMiddleware {
  use(req: RequestWithUser, _res: Response, next: NextFunction): void {
    const path = req.path;

    const isWhitelisted = AUTH_WHITELIST.some(
      (prefix) => path === prefix || path.startsWith(prefix + '/'),
    );

    if (!isWhitelisted) {
      const userId = req.headers['x-user-id'];
      const userEmail = req.headers['x-user-email'];
      const userRole = req.headers['x-user-role'];
      const userJti = req.headers['x-user-jti'];
      const userExp = req.headers['x-user-exp'];

      if (
        typeof userId === 'string' &&
        typeof userEmail === 'string' &&
        typeof userRole === 'string'
      ) {
        const payload: JwtPayload = {
          sub: userId,
          email: userEmail,
          role: userRole as Role,
          jti: typeof userJti === 'string' ? userJti : '',
        };

        if (typeof userExp === 'string') {
          payload.exp = parseInt(userExp, 10);
        }

        req.user = payload;
      }
    }

    next();
  }
}
