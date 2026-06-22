import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { RegistrationModule } from './registration/registration.module';
import { SocialModule } from './social/social.module';
import { GatewayIdentityMiddleware } from './common/gateway-identity.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3005),
        DATABASE_URL: Joi.string().required(),
        GATEWAY_URL: Joi.string().required(),
        SOCIAL_SERVICE_INTERNAL_URL: Joi.string().optional(),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
    }),
    PrismaModule,
    HealthModule,
    RegistrationModule,
    SocialModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(GatewayIdentityMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
