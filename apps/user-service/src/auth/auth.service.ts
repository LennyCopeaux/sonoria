import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtService } from './jwt.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import { slugify } from '@sonoria/utils';

const REFRESH_TTL = 604800; // 7 days in seconds

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    const role = dto.role === 'ARTIST' ? Role.ARTIST : Role.USER;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          role,
        },
      });

      if (role === Role.ARTIST) {
        const baseSlug = slugify(dto.name) || 'artist';
        const slug = `${baseSlug}-${created.id.slice(0, 8)}`;
        await tx.artistProfile.create({
          data: { userId: created.id, slug },
        });
      }

      return created;
    });

    const { access_token, refresh_token } = this.generateTokens(user);

    await this.storeRefreshToken(user.id, refresh_token);

    return {
      access_token,
      refresh_token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { access_token, refresh_token } = this.generateTokens(user);

    await this.storeRefreshToken(user.id, refresh_token);

    return {
      access_token,
      refresh_token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const userId = await this.redis.get(`auth:refresh:reverse:${refreshToken}`);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate tokens
    const oldToken = await this.redis.get(`auth:refresh:${userId}`);

    const { access_token, refresh_token: newRefreshToken } =
      this.generateTokens(user);

    // Clean up old tokens
    if (oldToken) {
      await this.redis.del(`auth:refresh:reverse:${oldToken}`);
    }
    await this.redis.del(`auth:refresh:${userId}`);

    await this.storeRefreshToken(userId, newRefreshToken);

    return { access_token, refresh_token: newRefreshToken };
  }

  async logout(
    userId: string,
    jti: string,
    exp: number,
    refreshToken?: string,
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      await this.redis.setEx(`auth:blacklist:${jti}`, '1', ttl);
    }

    const storedToken = await this.redis.get(`auth:refresh:${userId}`);
    await this.redis.del(`auth:refresh:${userId}`);

    if (storedToken) {
      await this.redis.del(`auth:refresh:reverse:${storedToken}`);
    }

    if (refreshToken) {
      await this.redis.del(`auth:refresh:reverse:${refreshToken}`);
    }
  }

  private generateTokens(user: { id: string; email: string; role: Role }): {
    access_token: string;
    refresh_token: string;
  } {
    const access_token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refresh_token = uuidv4();
    return { access_token, refresh_token };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.redis.setEx(`auth:refresh:${userId}`, refreshToken, REFRESH_TTL);
    await this.redis.setEx(
      `auth:refresh:reverse:${refreshToken}`,
      userId,
      REFRESH_TTL,
    );
  }
}
