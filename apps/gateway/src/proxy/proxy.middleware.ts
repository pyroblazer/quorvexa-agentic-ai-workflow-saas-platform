import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@quorvexa/observability';
import type { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

const logger = createLogger('gateway:proxy');

interface ServiceRoute {
  pathPrefix: string;
  target: string;
  pathRewrite?: Record<string, string>;
}

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly routes: ServiceRoute[];

  constructor(private readonly configService: ConfigService) {
    this.routes = [
      {
        pathPrefix: '/api/v1/auth',
        target: configService.get('AUTH_SERVICE_URL', 'http://localhost:3001'),
      },
      {
        pathPrefix: '/api/v1/users',
        target: configService.get('USER_SERVICE_URL', 'http://localhost:3002'),
      },
      {
        pathPrefix: '/api/v1/workflows',
        target: configService.get('WORKFLOW_SERVICE_URL', 'http://localhost:3003'),
      },
      {
        pathPrefix: '/api/v1/notifications',
        target: configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3004'),
      },
      {
        pathPrefix: '/api/v1/agents',
        target: configService.get('AI_AGENT_SERVICE_URL', 'http://localhost:3005'),
      },
    ];
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const route = this.routes.find((r) => req.path.startsWith(r.pathPrefix));

    if (!route) {
      next();
      return;
    }

    const proxyOptions: Options = {
      target: route.target,
      changeOrigin: true,
      on: {
        error: (err, _req, _res) => {
          logger.error({ err, target: route.target }, 'Proxy error');
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 502, message: 'Bad Gateway' }));
        },
        proxyReq: (proxyReq) => {
          proxyReq.setHeader('X-Forwarded-For', req.ip ?? '');
          proxyReq.setHeader('X-Gateway-Version', '1.0.0');
        },
      },
    };

    createProxyMiddleware(proxyOptions)(req, res, next);
  }
}
