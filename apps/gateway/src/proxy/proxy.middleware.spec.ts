jest.mock('@quorvexa/observability', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import { ProxyMiddleware } from './proxy.middleware';

describe('ProxyMiddleware', () => {
  let middleware: ProxyMiddleware;

  beforeEach(async () => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const defaults: Record<string, string> = {
          AUTH_SERVICE_URL: 'http://localhost:3001',
          USER_SERVICE_URL: 'http://localhost:3002',
          WORKFLOW_SERVICE_URL: 'http://localhost:3003',
          NOTIFICATION_SERVICE_URL: 'http://localhost:3004',
          AI_AGENT_SERVICE_URL: 'http://localhost:3005',
        };
        return defaults[key] ?? defaultValue ?? '';
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyMiddleware,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    middleware = module.get<ProxyMiddleware>(ProxyMiddleware);
  });

  describe('route configuration', () => {
    it('configures routes for all 5 microservices', () => {
      expect((middleware as any).routes).toHaveLength(5);
    });

    it('routes /api/v1/auth to auth-service', () => {
      const route = (middleware as any).routes.find(
        (r: any) => r.pathPrefix === '/api/v1/auth',
      );
      expect(route).toBeDefined();
      expect(route.target).toBe('http://localhost:3001');
    });

    it('routes /api/v1/users to user-service', () => {
      const route = (middleware as any).routes.find(
        (r: any) => r.pathPrefix === '/api/v1/users',
      );
      expect(route).toBeDefined();
      expect(route.target).toBe('http://localhost:3002');
    });

    it('routes /api/v1/workflows to workflow-service', () => {
      const route = (middleware as any).routes.find(
        (r: any) => r.pathPrefix === '/api/v1/workflows',
      );
      expect(route).toBeDefined();
      expect(route.target).toBe('http://localhost:3003');
    });

    it('routes /api/v1/notifications to notification-service', () => {
      const route = (middleware as any).routes.find(
        (r: any) => r.pathPrefix === '/api/v1/notifications',
      );
      expect(route).toBeDefined();
      expect(route.target).toBe('http://localhost:3004');
    });

    it('routes /api/v1/agents to ai-agent-service', () => {
      const route = (middleware as any).routes.find(
        (r: any) => r.pathPrefix === '/api/v1/agents',
      );
      expect(route).toBeDefined();
      expect(route.target).toBe('http://localhost:3005');
    });
  });

  describe('use', () => {
    it('calls next() for unmatched routes', () => {
      const req = { path: '/api/v1/unknown' } as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
