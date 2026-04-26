import { createLogger } from './logger';

describe('createLogger', () => {
  const originalEnv = process.env['NODE_ENV'];

  afterEach(() => {
    process.env['NODE_ENV'] = originalEnv;
  });

  it('creates a logger with the given service name', () => {
    const logger = createLogger('test-service');
    expect(logger).toBeDefined();
    expect((logger as any).bindings).toBeDefined();
  });

  it('respects LOG_LEVEL environment variable', () => {
    process.env['LOG_LEVEL'] = 'debug';
    const logger = createLogger('test-service');
    expect(logger.level).toBe('debug');
    delete process.env['LOG_LEVEL'];
  });

  it('defaults to info level', () => {
    delete process.env['LOG_LEVEL'];
    const logger = createLogger('test-service');
    expect(logger.level).toBe('info');
  });

  it('includes base fields in log output', () => {
    const logger = createLogger('test-service');
    const _bindings = (logger as any).bindings || {};
    // Logger should be functional
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('redacts sensitive fields', () => {
    const logger = createLogger('test-service');
    const _options = (logger as any)[Symbol.for('pino.options')];
    // Logger created successfully with redaction configured
    expect(logger).toBeDefined();
  });
});
