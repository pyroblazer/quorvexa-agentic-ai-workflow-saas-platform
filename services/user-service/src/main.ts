import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createLogger, initTracing } from '@quorvexa/observability';

initTracing('user-service', '1.0.0');

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = createLogger('user-service');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableCors({
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const config = new DocumentBuilder()
    .setTitle('Quorvexa User Service')
    .setDescription('User profile and preferences management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('users', 'User profile management')
    .addTag('user-preferences', 'User preferences')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, { swaggerOptions: { persistAuthorization: true } });

  const port = parseInt(process.env['PORT'] ?? '3002', 10);
  await app.listen(port);
  logger.info({ port, env: process.env['NODE_ENV'] }, 'User service started');
}

void bootstrap();
