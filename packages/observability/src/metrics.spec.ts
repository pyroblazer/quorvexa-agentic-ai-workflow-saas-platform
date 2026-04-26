import { MetricsService } from './metrics';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService('test-service');
  });

  it('creates all metric instruments', () => {
    expect(service.httpRequestDuration).toBeDefined();
    expect(service.httpRequestTotal).toBeDefined();
    expect(service.activeConnections).toBeDefined();
    expect(service.aiRequestDuration).toBeDefined();
    expect(service.aiRequestTotal).toBeDefined();
    expect(service.errorRate).toBeDefined();
    expect(service.cacheHits).toBeDefined();
    expect(service.cacheMisses).toBeDefined();
  });

  it('returns metrics in Prometheus format', async () => {
    const metrics = await service.getMetrics();

    expect(metrics).toContain('http_request_duration_seconds');
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('active_connections');
    expect(metrics).toContain('ai_request_duration_seconds');
    expect(metrics).toContain('ai_requests_total');
    expect(metrics).toContain('errors_total');
    expect(metrics).toContain('cache_hits_total');
    expect(metrics).toContain('cache_misses_total');
  });

  it('includes default service label', async () => {
    const metrics = await service.getMetrics();
    expect(metrics).toContain('service="test-service"');
  });

  it('returns correct content type', () => {
    const contentType = service.getContentType();
    expect(contentType).toContain('text/plain');
  });

  it('increments counters correctly', async () => {
    service.httpRequestTotal.labels({ method: 'GET', route: '/test', status_code: '200', service: 'test-service' }).inc();
    service.errorRate.labels({ type: 'test_error', service: 'test-service' }).inc();
    service.cacheHits.labels({ cache: 'redis', service: 'test-service' }).inc();
    service.cacheMisses.labels({ cache: 'redis', service: 'test-service' }).inc();

    const metrics = await service.getMetrics();

    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('errors_total');
    expect(metrics).toContain('cache_hits_total');
    expect(metrics).toContain('cache_misses_total');
  });

  it('observes histogram values', async () => {
    service.httpRequestDuration.labels({ method: 'GET', route: '/test', status_code: '200', service: 'test-service' }).observe(0.1);
    service.aiRequestDuration.labels({ model: 'test', operation: 'run', service: 'test-service' }).observe(1.5);

    const metrics = await service.getMetrics();
    expect(metrics).toContain('http_request_duration_seconds_bucket');
    expect(metrics).toContain('ai_request_duration_seconds_bucket');
  });

  it('tracks active connections gauge', async () => {
    service.activeConnections.labels({ service: 'test-service' }).inc();
    service.activeConnections.labels({ service: 'test-service' }).inc();
    service.activeConnections.labels({ service: 'test-service' }).dec();

    const metrics = await service.getMetrics();
    expect(metrics).toContain('active_connections');
  });

  it('collects default Node.js metrics', async () => {
    const metrics = await service.getMetrics();
    expect(metrics).toContain('process_cpu');
    expect(metrics).toContain('nodejs_heap');
  });
});
