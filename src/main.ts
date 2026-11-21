import {
  configureObservability,
  createServiceLogger,
} from './observability/observability';
import {
  assertLocalDatabase,
  localMode,
  localOrigins,
} from './local-development/local-development';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.GENERATE_OPENAPI === 'true') {
    throw new Error('OpenAPI generation mode cannot serve HTTP');
  }
  assertLocalDatabase();
  const app = await NestFactory.create(AppModule, {
    logger: createServiceLogger(),
  });
  configureObservability(app);
  app.use(cookieParser());
  if (localMode()) app.enableCors({ origin: localOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
  );

  await app.listen(
    process.env.PORT ?? 3004,
    localMode() ? '127.0.0.1' : '0.0.0.0'
  );
}
bootstrap().catch(() => {
  createServiceLogger().error('Service startup failed', 'Bootstrap');
  process.exitCode = 1;
});
