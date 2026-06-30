import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, AuthGuard, RolesGuard],
  exports: [JwtService, AuthGuard, RolesGuard],
})
export class AuthModule {}
