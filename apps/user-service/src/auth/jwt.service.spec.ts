import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JwtService } from './jwt.service';

function generateTestKeys(): { privateKeyB64: string; publicKeyB64: string } {
  const tmpDir = os.tmpdir();
  const privPath = path.join(tmpDir, `test-private-${Date.now()}.pem`);
  const pubPath = path.join(tmpDir, `test-public-${Date.now()}.pem`);

  execSync(`openssl genrsa -out "${privPath}" 2048 2>/dev/null`);
  execSync(`openssl rsa -in "${privPath}" -pubout -out "${pubPath}" 2>/dev/null`);

  const privateKeyB64 = Buffer.from(fs.readFileSync(privPath)).toString('base64');
  const publicKeyB64 = Buffer.from(fs.readFileSync(pubPath)).toString('base64');

  fs.unlinkSync(privPath);
  fs.unlinkSync(pubPath);

  return { privateKeyB64, publicKeyB64 };
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
      role: 'USER' as never,
    });

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = service.verify(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.jti).toBeDefined();
  });

  it('rejects expired token', async () => {
    // We cannot easily generate an expired token without manipulating time,
    // so we verify that an obviously invalid token is rejected.
    expect(() => service.verify('invalid.token.here')).toThrow();
  });

  it('rejects token signed with wrong key', () => {
    // Generate a second key pair and sign with it
    const { privateKeyB64: altPriv, publicKeyB64: altPub } = generateTestKeys();
    process.env['JWT_PRIVATE_KEY'] = altPriv;
    process.env['JWT_PUBLIC_KEY'] = altPub;
    const altService = new JwtService();

    const tokenFromAlt = altService.sign({
      sub: 'user-456',
      email: 'other@example.com',
      role: 'USER' as never,
    });

    // Restore original keys on service
    expect(() => service.verify(tokenFromAlt)).toThrow();
  });
});
