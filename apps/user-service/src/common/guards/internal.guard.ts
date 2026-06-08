import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const token = request.headers['x-internal-token'];
    const expected = this.config.get<string>('INTERNAL_API_TOKEN');

    if (!expected || typeof token !== 'string' || token !== expected) {
      throw new UnauthorizedException('Internal access only');
    }

    return true;
  }
}
