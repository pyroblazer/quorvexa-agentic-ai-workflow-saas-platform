import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createLogger, initTracing } from '@quorvexa/observability';

import { AppModule } from './app.module';
import { createServiceRoutes, gatewayProxy } from './proxy/proxy.middleware';

initTracing('gateway', '1.0.0');

async function bootstrap() {
  const logger = createLogger('gateway');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  const configService = app.get(ConfigService);
  const routes = createServiceRoutes((key, fb) => configService.get(key, fb));

  // Register proxy directly on Express app — runs before NestJS router
  app.use(gatewayProxy(routes));

  app.enableCors({
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const config = new DocumentBuilder()
    .setTitle('Quorvexa API Gateway')
    .setDescription('Unified API Gateway — routes to all downstream microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:4000', 'Local')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env['PORT'] ?? '4000', 10);
  await app.listen(port);
  logger.info({ port }, 'API Gateway started');
}

void bootstrap();
