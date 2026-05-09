import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createLogger, initTracing } from '@quorvexa/observability';

initTracing('workflow-service', '1.0.0');

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = createLogger('workflow-service');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  app.enableCors({
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const config = new DocumentBuilder()
    .setTitle('Quorvexa Workflow Service')
    .setDescription('Workflow and pipeline management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('workflows', 'Workflow management')
    .addTag('tasks', 'Task management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env['PORT'] ?? '3003', 10);
  await app.listen(port);
  logger.info({ port }, 'Workflow service started');
}

void bootstrap();
