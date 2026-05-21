import { createLogger } from '@quorvexa/observability';
import type { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';

const logger = createLogger('gateway:proxy');

interface ServiceRoute {
  pathPrefix: string;
  proxy: RequestHandler;
}

export function createServiceRoutes(
  getEnv: (key: string, fallback: string) => string,
): ServiceRoute[] {
  const routes: [string, string][] = [
    ['/api/v1/auth', getEnv('AUTH_SERVICE_URL', 'http://localhost:3001')],
    ['/api/v1/users', getEnv('USER_SERVICE_URL', 'http://localhost:3002')],
    ['/api/v1/workflows', getEnv('WORKFLOW_SERVICE_URL', 'http://localhost:3003')],
    ['/api/v1/notifications', getEnv('NOTIFICATION_SERVICE_URL', 'http://localhost:3004')],
    ['/api/v1/agents', getEnv('AI_AGENT_SERVICE_URL', 'http://localhost:3005')],
  ];

  return routes.map(([pathPrefix, target]) => ({
    pathPrefix,
    proxy: createProxyMiddleware({
      target,
      changeOrigin: true,
      on: {
        error: (err, _req, res) => {
          logger.error({ err, target }, 'Proxy error');
          const httpResponse = res as Response;
          if (!httpResponse.headersSent) {
            httpResponse.writeHead(502, { 'Content-Type': 'application/json' });
            httpResponse.end(JSON.stringify({ statusCode: 502, message: 'Bad Gateway' }));
          }
        },
        proxyReq: (proxyReq) => {
          proxyReq.setHeader('X-Gateway-Version', '1.0.0');
        },
      },
    }),
  }));
}

export function gatewayProxy(routes: ServiceRoute[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const route = routes.find((r) => req.path.startsWith(r.pathPrefix));

    if (!route) {
      next();
      return;
    }

    route.proxy(req, res, next);
  };
}
