import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export class MetricsService {
  private readonly registry: Registry;
  readonly httpRequestDuration: Histogram;
  readonly httpRequestTotal: Counter;
  readonly activeConnections: Gauge;
  readonly aiRequestDuration: Histogram;
  readonly aiRequestTotal: Counter;
  readonly errorRate: Counter;
  readonly cacheHits: Counter;
  readonly cacheMisses: Counter;

  constructor(private readonly serviceName: string) {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ service: serviceName });
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['service'],
      registers: [this.registry],
    });

    this.aiRequestDuration = new Histogram({
      name: 'ai_request_duration_seconds',
      help: 'Duration of AI/LLM requests in seconds',
      labelNames: ['model', 'operation', 'service'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.aiRequestTotal = new Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI/LLM requests',
      labelNames: ['model', 'operation', 'status', 'service'],
      registers: [this.registry],
    });

    this.errorRate = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'service'],
      registers: [this.registry],
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache', 'service'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache', 'service'],
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
