import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

const mockRedis = {
  setEx: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
};

const mockJwtService = {
  sign: vi.fn().mockReturnValue('mock.access.token'),
  verify: vi.fn(),
};

function buildService(): AuthService {
  return new AuthService(
    mockPrisma as never,
    mockRedis as never,
    mockJwtService as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthService.register', () => {
  it('creates user and returns tokens on success', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: Role.USER,
    });

    const service = buildService();
    const result = await service.register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(result.access_token).toBe('mock.access.token');
    expect(result.refresh_token).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(mockRedis.setEx).toHaveBeenCalledTimes(2);
  });

  it('throws ConflictException if email already taken', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'existing@example.com',
    });

    const service = buildService();

    await expect(
      service.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('AuthService.login', () => {
  it('returns tokens on valid credentials', async () => {
    const hash = await argon2.hash('password123');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      role: Role.USER,
    });

    const service = buildService();
    const result = await service.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.access_token).toBe('mock.access.token');
    expect(result.refresh_token).toBeDefined();
  });

  it('throws UnauthorizedException if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const service = buildService();

    await expect(
      service.login({ email: 'noone@example.com', password: 'pass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException if password wrong', async () => {
    const hash = await argon2.hash('correctpassword');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      role: Role.USER,
    });

    const service = buildService();

    await expect(
      service.login({ email: 'test@example.com', password: 'wrongpassword' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService.refresh', () => {
  it('rotates tokens successfully', async () => {
    mockRedis.get
      .mockResolvedValueOnce('user-1') // reverse lookup
      .mockResolvedValueOnce('old-refresh-token'); // current refresh token

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: Role.USER,
    });

    const service = buildService();
    const result = await service.refresh('some-refresh-token');

    expect(result.access_token).toBe('mock.access.token');
    expect(result.refresh_token).toBeDefined();
    expect(mockRedis.del).toHaveBeenCalledTimes(2);
    expect(mockRedis.setEx).toHaveBeenCalledTimes(2);
  });

  it('throws UnauthorizedException if token not in Redis', async () => {
    mockRedis.get.mockResolvedValue(null);

    const service = buildService();

    await expect(service.refresh('invalid-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('AuthService.logout', () => {
  it('blacklists jti and clears refresh tokens', async () => {
    mockRedis.get.mockResolvedValue('old-refresh-token');

    const service = buildService();
    const exp = Math.floor(Date.now() / 1000) + 900;

    await service.logout('user-1', 'some-jti', exp, 'old-refresh-token');

    expect(mockRedis.setEx).toHaveBeenCalledWith(
      'auth:blacklist:some-jti',
      '1',
      expect.any(Number),
    );
    expect(mockRedis.del).toHaveBeenCalledWith('auth:refresh:user-1');
    expect(mockRedis.del).toHaveBeenCalledWith(
      'auth:refresh:reverse:old-refresh-token',
    );
  });
});
