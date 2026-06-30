import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string): void {
  const secure = process.env['NODE_ENV'] === 'production';
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: REFRESH_TTL_MS,
  });
}

interface RequestWithUser extends Request {
  user?: JwtPayload | undefined;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, access_token, user } =
      await this.authService.register(dto);
    setRefreshCookie(res, refresh_token);
    return { access_token, user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, access_token, user } =
      await this.authService.login(dto);
    setRefreshCookie(res, refresh_token);
    return { access_token, user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req.cookies as Record<string, string | undefined>)[
      'refresh_token'
    ];

    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const { access_token, refresh_token } =
      await this.authService.refresh(token);
    setRefreshCookie(res, refresh_token);
    return { access_token };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    const refreshToken = (req.cookies as Record<string, string | undefined>)[
      'refresh_token'
    ];

    const exp = user.exp ?? 0;

    await this.authService.logout(user.sub, user.jti, exp, refreshToken);

    res.clearCookie('refresh_token');

    return { success: true };
  }
}
