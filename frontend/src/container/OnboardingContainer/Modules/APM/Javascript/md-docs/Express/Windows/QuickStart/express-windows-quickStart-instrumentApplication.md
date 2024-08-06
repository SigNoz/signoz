
#### Requirements
- Supported Versions ^4.0.0
&nbsp;

### Step 1: Install OpenTelemetry packages

```bash
npm install --save @opentelemetry/api@^1.6.0
npm install --save @opentelemetry/sdk-node@^0.45.0
npm install --save @opentelemetry/auto-instrumentations-node@^0.39.4
npm install --save @opentelemetry/exporter-trace-otlp-http@^0.45.0
```
&nbsp;

### Step 2: Create tracing.js file

```bash
// tracing.js
'use strict'
const process = require('process');
const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// do not set headers in exporterOptions, the OTel spec recommends setting headers through ENV variables
// https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/exporter.md#specifying-headers-via-environment-variables

const exporterOptions = {
  url: 'https://ingest.{{REGION}}.signoz.cloud:443/v1/traces'
}

const traceExporter = new OTLPTraceExporter(exporterOptions);
const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: '{{MYAPP}}'
  })
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start()

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```