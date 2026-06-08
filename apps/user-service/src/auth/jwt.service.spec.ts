import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { JwtService } from './jwt.service';

function generateTestKeys(): { privateKeyB64: string; publicKeyB64: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    privateKeyB64: Buffer.from(privateKey).toString('base64'),
    publicKeyB64: Buffer.from(publicKey).toString('base64'),
  };
}

describe('JwtService', () => {
  let service: JwtService;

  beforeAll(() => {
    const { privateKeyB64, publicKeyB64 } = generateTestKeys();
    process.env['JWT_PRIVATE_KEY'] = privateKeyB64;
    process.env['JWT_PUBLIC_KEY'] = publicKeyB64;
    service = new JwtService();
  });

  it('sign and verify roundtrip returns correct payload', () => {
    const token = service.sign({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'USER',
    });

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = service.verify(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.jti).toBeDefined();
  });

  it('rejects invalid token', () => {
    expect(() => service.verify('invalid.token.here')).toThrow();
  });

  it('rejects token signed with wrong key', () => {
    const { privateKeyB64: altPriv, publicKeyB64: altPub } = generateTestKeys();
    process.env['JWT_PRIVATE_KEY'] = altPriv;
    process.env['JWT_PUBLIC_KEY'] = altPub;
    const altService = new JwtService();

    const tokenFromAlt = altService.sign({
      sub: 'user-456',
      email: 'other@example.com',
      role: 'USER',
    });

    expect(() => service.verify(tokenFromAlt)).toThrow();
  });
});
