import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createLogger, initTracing } from '@quorvexa/observability';

// Must be called before any other imports to ensure instrumentation works
initTracing('auth-service', '1.0.0');

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = createLogger('auth-service');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  // CORS — only allow configured origins
  app.enableCors({
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  // Global validation pipe — strips unknown fields, throws on invalid input
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // API versioning — prefix all routes with /api/v{version}
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Quorvexa Auth Service')
    .setDescription('Authentication and authorization API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port);

  logger.info({ port, env: process.env['NODE_ENV'] }, 'Auth service started');
}

void bootstrap();
