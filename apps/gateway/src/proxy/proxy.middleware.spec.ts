jest.mock('@quorvexa/observability', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

import type { Request, Response } from 'express';

import { createServiceRoutes, gatewayProxy } from './proxy.middleware';

const mockGetEnv = jest.fn((key: string, fallback: string) => {
  const defaults: Record<string, string> = {
    AUTH_SERVICE_URL: 'http://localhost:3001',
    USER_SERVICE_URL: 'http://localhost:3002',
    WORKFLOW_SERVICE_URL: 'http://localhost:3003',
    NOTIFICATION_SERVICE_URL: 'http://localhost:3004',
    AI_AGENT_SERVICE_URL: 'http://localhost:3005',
  };
  return defaults[key] ?? fallback;
});

describe('Gateway Proxy', () => {
  describe('createServiceRoutes', () => {
    it('configures routes for all 5 microservices', () => {
      const routes = createServiceRoutes(mockGetEnv);
      expect(routes).toHaveLength(5);
    });

    it('routes /api/v1/auth to auth-service', () => {
      const routes = createServiceRoutes(mockGetEnv);
      const route = routes.find((r) => r.pathPrefix === '/api/v1/auth');
      expect(route).toBeDefined();
    });

    it('routes /api/v1/users to user-service', () => {
      const routes = createServiceRoutes(mockGetEnv);
      const route = routes.find((r) => r.pathPrefix === '/api/v1/users');
      expect(route).toBeDefined();
    });

    it('routes /api/v1/workflows to workflow-service', () => {
      const routes = createServiceRoutes(mockGetEnv);
      const route = routes.find((r) => r.pathPrefix === '/api/v1/workflows');
      expect(route).toBeDefined();
    });

    it('routes /api/v1/notifications to notification-service', () => {
      const routes = createServiceRoutes(mockGetEnv);
      const route = routes.find((r) => r.pathPrefix === '/api/v1/notifications');
      expect(route).toBeDefined();
    });

    it('routes /api/v1/agents to ai-agent-service', () => {
      const routes = createServiceRoutes(mockGetEnv);
      const route = routes.find((r) => r.pathPrefix === '/api/v1/agents');
      expect(route).toBeDefined();
    });
  });

  describe('gatewayProxy', () => {
    it('calls next() for unmatched routes', () => {
      const routes = createServiceRoutes(mockGetEnv);
      const proxy = gatewayProxy(routes);
      const req = { path: '/api/v1/unknown' } as Request;
      const res = {} as Response;
      const next = jest.fn();

      proxy(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
