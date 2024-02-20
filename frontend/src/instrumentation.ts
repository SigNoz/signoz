/* eslint-disable import/no-extraneous-dependencies */
import opentelemetry from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import {
	MeterProvider,
	PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = Resource.default().merge(
	new Resource({
		[SemanticResourceAttributes.SERVICE_NAME]: 'service-name-here',
		[SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
	}),
);

const provider = new WebTracerProvider({
	resource,
});
const exporter = new OTLPTraceExporter({
	url: 'http://127.0.0.1:4318/v1/traces',
});
const processor = new BatchSpanProcessor(exporter);
provider.addSpanProcessor(processor);

registerInstrumentations({
	instrumentations: [getWebAutoInstrumentations()],
});

provider.register();

const metricReader = new PeriodicExportingMetricReader({
	exporter: new OTLPMetricExporter({
		url: 'http://127.0.0.1:4318/v1/metrics',
	}),
	// Default is 60000ms (60 seconds). Set to 10 seconds for demonstrative purposes only.
	exportIntervalMillis: 10000,
});

const myServiceMeterProvider = new MeterProvider({
	resource,
	readers: [metricReader],
});

// Set this MeterProvider to be global to the app being instrumented.
opentelemetry.metrics.setGlobalMeterProvider(myServiceMeterProvider);
