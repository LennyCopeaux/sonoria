import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // All social endpoints live under /social so the gateway can route them by a
  // single dedicated prefix. /health stays unprefixed for gateway polling.
  app.setGlobalPrefix('social', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env['PORT'] ?? 3005;
  await app.listen(port);
}

void bootstrap();
