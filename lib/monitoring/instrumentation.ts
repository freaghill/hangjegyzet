import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import * as api from '@opentelemetry/api';

// Initialize OpenTelemetry
export function initializeOpenTelemetry() {
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'hangjegyzet-app',
    [ATTR_SERVICE_VERSION]: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });

  // Prometheus exporter for metrics
  const prometheusExporter = new PrometheusExporter(
    {
      port: 9464, // Default Prometheus port
      endpoint: '/metrics',
    },
    () => {
      console.log('Prometheus metrics server started on port 9464');
    }
  );

  // Console metric exporter for development
  const consoleMetricExporter = new ConsoleMetricExporter();
  
  // Use console exporter in development, Prometheus in production
  const metricReader = process.env.NODE_ENV === 'production' 
    ? prometheusExporter
    : new PeriodicExportingMetricReader({
        exporter: consoleMetricExporter,
        exportIntervalMillis: 10000, // Export every 10 seconds in dev
      });

  const sdk = new NodeSDK({
    resource,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable fs instrumentation to reduce noise
        },
        '@opentelemetry/instrumentation-http': {
          requestHook: (span, request) => {
            // Add custom attributes to HTTP spans
            span.setAttribute('http.request.body.size', request.headers['content-length'] || 0);
          },
          responseHook: (span, response) => {
            // Add custom response attributes
            span.setAttribute('http.response.body.size', response.headers['content-length'] || 0);
          },
          ignoreIncomingRequestHook: (request) => {
            // Ignore health check endpoints and static assets
            const url = request.url || '';
            return url.includes('/health') || 
                   url.includes('/_next/') || 
                   url.includes('/static/') ||
                   url.includes('/favicon');
          },
        },
      }),
    ],
    metricReader,
  });

  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry terminated successfully'))
      .catch((error) => console.error('Error terminating OpenTelemetry', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

// Create custom meters for application-specific metrics
const meter = api.metrics.getMeter('hangjegyzet-app');

// Meeting metrics
export const meetingCounter = meter.createCounter('meetings_created_total', {
  description: 'Total number of meetings created',
});

export const transcriptionDurationHistogram = meter.createHistogram('transcription_duration_seconds', {
  description: 'Duration of transcription processing in seconds',
  unit: 'seconds',
});

export const activeUsersGauge = meter.createUpDownCounter('active_users', {
  description: 'Number of currently active users',
});

export const aiProcessingCounter = meter.createCounter('ai_processing_total', {
  description: 'Total number of AI processing requests',
});

export const storageUsageGauge = meter.createObservableGauge('storage_usage_bytes', {
  description: 'Current storage usage in bytes',
});

// Error metrics
export const errorCounter = meter.createCounter('errors_total', {
  description: 'Total number of errors',
});

// Payment metrics
export const paymentCounter = meter.createCounter('payments_total', {
  description: 'Total number of payment transactions',
});

export const revenueCounter = meter.createCounter('revenue_total', {
  description: 'Total revenue in cents',
  unit: 'cents',
});

// Queue metrics
export const queueJobsCounter = meter.createCounter('queue_jobs_total', {
  description: 'Total number of jobs processed',
});

export const queueJobDurationHistogram = meter.createHistogram('queue_job_duration_seconds', {
  description: 'Duration of queue job processing',
  unit: 'seconds',
});

// Helper function to record metrics
export function recordMetric(
  metric: api.Counter | api.Histogram | api.UpDownCounter,
  value: number,
  attributes?: api.Attributes
) {
  if (metric instanceof api.Counter || metric instanceof api.UpDownCounter) {
    metric.add(value, attributes);
  } else if (metric instanceof api.Histogram) {
    metric.record(value, attributes);
  }
}

// Custom span creation helper
export function createCustomSpan(
  name: string,
  options?: api.SpanOptions
): api.Span {
  const tracer = api.trace.getTracer('hangjegyzet-app');
  return tracer.startSpan(name, options);
}

// Async operation wrapper with automatic span creation
export async function withSpan<T>(
  name: string,
  fn: (span: api.Span) => Promise<T>,
  options?: api.SpanOptions
): Promise<T> {
  const span = createCustomSpan(name, options);
  
  try {
    const result = await fn(span);
    span.setStatus({ code: api.SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: api.SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

// Export the API for use in other files
export const openTelemetryApi = api;