import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RegistrationModule } from './registration/registration.module';
import { CommonModule } from './common/common.module';
import { TracksModule } from './tracks/tracks.module';
import { GatewayIdentityMiddleware } from './common/gateway-identity.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_PRIVATE_KEY: Joi.string().required(),
        JWT_PUBLIC_KEY: Joi.string().required(),
        GATEWAY_URL: Joi.string().required(),
        INTERNAL_API_TOKEN: Joi.string().required(),
        MEDIA_SERVICE_URL: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
    RegistrationModule,
    CommonModule,
    TracksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(GatewayIdentityMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
