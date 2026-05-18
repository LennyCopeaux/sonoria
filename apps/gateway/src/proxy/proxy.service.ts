import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { Request, Response } from 'express';
import type { AuthUser } from '../auth/jwt.guard';
import { RegistryService } from '../registry/registry.service';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly registry: RegistryService) {}

  async forward(
    req: Request & { user?: AuthUser },
    res: Response,
  ): Promise<void> {
    const path = req.path;
    const target = await this.registry.resolve(path);
    if (!target)
      throw new NotFoundException(`No service registered for ${path}`);

    const url = target.internalUrl.replace(/\/+$/, '') + path;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (HOP_BY_HOP.has(key.toLowerCase())) continue;
      if (Array.isArray(value)) headers[key] = value.join(',');
      else if (typeof value === 'string') headers[key] = value;
    }
    if (req.user) {
      headers['x-user-id'] = req.user.sub;
      headers['x-user-email'] = req.user.email;
      headers['x-user-role'] = req.user.role;
    }

    const config: AxiosRequestConfig = {
      method: req.method,
      url,
      headers,
      params: req.query,
      data: ['GET', 'HEAD'].includes(req.method.toUpperCase())
        ? undefined
        : (req.body as unknown),
      validateStatus: () => true,
      timeout: 15_000,
      responseType: 'arraybuffer',
    };

    try {
      const upstream = await axios.request(config);
      for (const [key, value] of Object.entries(upstream.headers)) {
        if (HOP_BY_HOP.has(key.toLowerCase())) continue;
        if (value !== undefined) res.setHeader(key, value as string | string[]);
      }
      res.status(upstream.status).send(upstream.data);
    } catch (err) {
      if (err instanceof AxiosError) {
        this.logger.error(`Proxy failure → ${url}: ${err.message}`);
        throw new BadGatewayException(`Upstream ${target.name} unreachable`);
      }
      if (err instanceof HttpException) throw err;
      throw new BadGatewayException('Proxy error');
    }
  }
}
