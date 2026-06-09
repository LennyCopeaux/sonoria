import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { parseEnabledQueues } from './config/queues.config';
import { PrismaModule } from './prisma/prisma.module';
import { ProcessorsModule } from './processors/processors.module';
import { RedisModule } from './redis/redis.module';
import { S3Module } from './s3/s3.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { UserClientModule } from './user-client/user-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3003),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        S3_ENDPOINT: Joi.string().required(),
        S3_REGION: Joi.string().default('us-east-1'),
        S3_ACCESS_KEY: Joi.string().required(),
        S3_SECRET_KEY: Joi.string().required(),
        S3_BUCKET: Joi.string().required(),
        S3_FORCE_PATH_STYLE: Joi.string().default('true'),
        JOB_QUEUE_NAME: Joi.string().default('media-processing'),
        JOB_CONCURRENCY: Joi.number().default(4),
        USER_SERVICE_URL: Joi.string().required(),
        INTERNAL_API_TOKEN: Joi.string().required(),
        QUEUES: Joi.string().default(
          'audio:transcode,notification:email,stats:aggregate,reco:refresh,cache:invalidate',
        ),
        SMTP_HOST: Joi.string().allow('').default(''),
        SMTP_PORT: Joi.number().default(1025),
        SMTP_USER: Joi.string().allow('').default(''),
        SMTP_PASS: Joi.string().allow('').default(''),
        FFMPEG_PATH: Joi.string().allow('').default(''),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    S3Module,
    UserClientModule,
    ProcessorsModule.register(parseEnabledQueues(process.env['QUEUES'])),
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
