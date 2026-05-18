import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import { JwtPayload } from './types';

@Injectable()
export class JwtService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor() {
    const privateKeyB64 = process.env['JWT_PRIVATE_KEY'];
    const publicKeyB64 = process.env['JWT_PUBLIC_KEY'];

    if (!privateKeyB64 || !publicKeyB64) {
      throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set');
    }

    this.privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf-8');
    this.publicKey = Buffer.from(publicKeyB64, 'base64').toString('utf-8');
  }

  sign(payload: { sub: string; email: string; role: Role }): string {
    const jti = uuidv4();
    return sign({ ...payload, jti }, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
    });
  }

  verify(token: string): JwtPayload {
    return verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as JwtPayload;
  }
}
