import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3003),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  KAFKA_BROKER: z.string().default('localhost:9092'),
  AI_AGENT_SERVICE_URL: z.string().url().default('http://localhost:3005'),
  NOTIFICATION_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});
