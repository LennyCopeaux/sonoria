import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { RegistrationModule } from './registration/registration.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3002),
        REDIS_URL: Joi.string().required(),
        GATEWAY_URL: Joi.string().required(),
        S3_ENDPOINT: Joi.string().required(),
        S3_REGION: Joi.string().default('us-east-1'),
        S3_ACCESS_KEY: Joi.string().required(),
        S3_SECRET_KEY: Joi.string().required(),
        S3_BUCKET: Joi.string().required(),
        S3_FORCE_PATH_STYLE: Joi.string().default('true'),
        JOB_QUEUE_NAME: Joi.string().default('media-processing'),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
    }),
    RedisModule,
    HealthModule,
    RegistrationModule,
    MediaModule,
  ],
})
export class AppModule {}
