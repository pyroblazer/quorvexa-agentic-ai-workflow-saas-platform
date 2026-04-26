import pino from 'pino';

export type Logger = pino.Logger;

export function createLogger(service: string): Logger {
  return pino({
    name: service,
    level: process.env['LOG_LEVEL'] ?? 'info',
    base: {
      service,
      env: process.env['NODE_ENV'] ?? 'development',
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport:
      process.env['NODE_ENV'] !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    redact: {
      paths: ['req.headers.authorization', 'body.password', 'body.token', '*.password', '*.secret'],
      censor: '[REDACTED]',
    },
  });
}
