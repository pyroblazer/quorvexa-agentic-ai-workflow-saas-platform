import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Service URLs
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  WORKFLOW_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  NOTIFICATION_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  AI_AGENT_SERVICE_URL: z.string().url().default('http://localhost:3005'),

  // Security
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});
