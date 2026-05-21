import type { Request, Response } from 'express';
import express from 'express';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { initTracing } from '@quorvexa/observability';

import { AppModule } from '../src/app.module';
import { createServiceRoutes, gatewayProxy } from '../src/proxy/proxy.middleware';

initTracing('gateway', '1.0.0');

const server = express();
const adapter = new ExpressAdapter(server);
let cachedApp: Awaited<ReturnType<typeof NestFactory.create>> | null = null;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn', 'log'],
    });

    const routes = createServiceRoutes(
      (key, fallback) => process.env[key] ?? fallback,
    );
    app.use(gatewayProxy(routes));

    app.enableCors({
      origin: (process.env['CORS_ORIGINS'] ?? '').split(','),
      credentials: true,
    });

    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    await app.init();
    cachedApp = app;
  }
  return server;
}

export default async (req: Request, res: Response) => {
  const app = await bootstrap();
  app(req, res);
};
