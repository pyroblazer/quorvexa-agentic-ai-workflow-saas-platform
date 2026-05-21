import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

export function initTracing(serviceName: string, serviceVersion = '1.0.0'): void {
  const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4317';

  const headers: Record<string, string> = {};
  const rawHeaders = process.env['OTEL_EXPORTER_OTLP_HEADERS'];
  if (rawHeaders) {
    for (const pair of rawHeaders.split(',')) {
      const [key, value] = pair.split('=');
      if (key && value) headers[key.trim()] = value.trim();
    }
  }

  const traceExporter = new OTLPTraceExporter({ url: otlpEndpoint, headers });

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
      environment: process.env['NODE_ENV'] ?? 'development',
    }),
    traceExporter,
    instrumentations: [new HttpInstrumentation()],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      ?.shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}
