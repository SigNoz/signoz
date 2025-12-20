const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { LoggerProvider, SimpleLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { BatchSpanProcessor, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { logs } = require('@opentelemetry/api-logs');

function initializeTelemetry(serviceName) {
  const isDebug = process.env.OTEL_DEBUG === 'true' || process.env.OTEL_DEBUG === '1';
  
  if (isDebug) {
    console.error(`\n[${serviceName}] ========================================`);
    console.error(`[${serviceName}] OpenTelemetry Debug Mode Enabled`);
    console.error(`[${serviceName}] ========================================`);
  }

  const otlpTraceExporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  });

  if (isDebug) {
    otlpTraceExporter.export = (function(originalExport) {
      return function(spans, resultCallback) {
        console.error(`[${serviceName}] OTLP Trace Exporter: Attempting to export ${spans.length} span(s)`);
        const result = originalExport.call(this, spans, function(result) {
          if (result.code !== 0) {
            console.error(`[${serviceName}] OTLP Trace Exporter Error:`, result);
          } else {
            console.error(`[${serviceName}] OTLP Trace Exporter: Successfully exported ${spans.length} span(s)`);
          }
          if (resultCallback) resultCallback(result);
        });
        return result;
      };
    })(otlpTraceExporter.export);
  }

  const metricExporter = new OTLPMetricExporter({
    url: 'http://localhost:4318/v1/metrics',
  });

  if (isDebug) {
    const originalExport = metricExporter.export.bind(metricExporter);
    metricExporter.export = function(metrics, resultCallback) {
      console.error(`[${serviceName}] OTLP Metric Exporter: Attempting to export metrics`);
      return originalExport(metrics, function(result) {
        if (result.code !== 0) {
          console.error(`[${serviceName}] OTLP Metric Exporter Error:`, result);
        } else {
          console.error(`[${serviceName}] OTLP Metric Exporter: Successfully exported metrics`);
        }
        if (resultCallback) resultCallback(result);
      });
    };
  }

  const logExporter = new OTLPLogExporter({
    url: 'http://localhost:4318/v1/logs',
  });

  if (isDebug) {
    console.error(`[${serviceName}] Initializing OpenTelemetry SDK...`);
    console.error(`[${serviceName}] Service Name: ${serviceName}`);
    console.error(`[${serviceName}] Trace Exporter URL: http://localhost:4318/v1/traces`);
    console.error(`[${serviceName}] Console Span Exporter: ${isDebug ? 'Enabled' : 'Disabled'}`);
    console.error(`[${serviceName}] Metric Exporter URL: http://localhost:4318/v1/metrics`);
    console.error(`[${serviceName}] Log Exporter URL: http://localhost:4318/v1/logs`);
  }

  const spanProcessors = [
    new BatchSpanProcessor(otlpTraceExporter, {
      maxExportBatchSize: 512,
      scheduledDelayMillis: 1000,
      exportTimeoutMillis: 4000,
    }),
  ];

  if (isDebug) {
    const consoleTraceExporter = new ConsoleSpanExporter();
    spanProcessors.push(new SimpleSpanProcessor(consoleTraceExporter));
  }

  const sdk = new NodeSDK({
    autoDetectResources: true,
    serviceName,
    spanProcessors,
    instrumentations: [getNodeAutoInstrumentations()],
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 1000,
    }),
  });

  const loggerProvider = new LoggerProvider({
    serviceName,
    processors: [new SimpleLogRecordProcessor(logExporter)],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  sdk.start();

  if (isDebug) {
    console.error(`[${serviceName}] OpenTelemetry SDK started successfully`);
    console.error(`[${serviceName}] ========================================\n`);
  }

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => {
        if (isDebug) {
          console.error(`[${serviceName}] OpenTelemetry SDK shut down gracefully`);
        }
      })
      .catch((error) => {
        console.error(`[${serviceName}] Error shutting down OpenTelemetry SDK:`, error);
      })
      .finally(() => process.exit(0));
  });

  process.on('unhandledRejection', (reason, promise) => {
    if (isDebug) {
      console.error(`[${serviceName}] Unhandled Rejection at:`, promise, 'reason:', reason);
    }
  });

  return { sdk, loggerProvider };
}

module.exports = { initializeTelemetry };

