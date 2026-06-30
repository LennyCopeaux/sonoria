import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types';

export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: JwtPayload | undefined }>();
    return request.user;
  },
);
