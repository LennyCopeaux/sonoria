import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@ApiExcludeController()
@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All('*splat')
  forward(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward(req, res);
  }
}
