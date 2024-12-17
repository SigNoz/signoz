#### Requirements
- Supported Versions >= `4.0.0`

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

```javascript
'use strict';

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import * as opentelemetry from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Configure the SDK to export telemetry data to the console
// Enable all auto-instrumentations from the meta package
const exporterOptions = {
  url: 'https://ingest.{{REGION}}.signoz.cloud:443/v1/traces',
};

const traceExporter = new OTLPTraceExporter(exporterOptions);
const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: '{{MYAPP}}',
  }),
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start();

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
```
&nbsp;

### Step 3: Import tracer in the `main.js file`

**Important Note**: The below import should be the first line in the main file of your application (Ex -> `main.ts`)
```bash
const tracer = require('./tracer')
```
&nbsp;

### Step 4: Start the tracer
In the `async function boostrap` section of the application code, initialize the tracer as follows:

```javascript
const tracer = require('./tracer')

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
  // All of your application code and any imports that should leverage
  // OpenTelemetry automatic instrumentation must go here.

async function bootstrap() {
    await tracer.start();
    const app = await NestFactory.create(AppModule);
    await app.listen(3001);
  }
  bootstrap();
```

&nbsp;

### Step 5: Dockerize your application

Set the SigNoz ingestion key Environment variable and expose port 3001 in Dockerfile as:

```bash
...
# Use an environment variable for the Signoz Ingestion Key
ENV OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}"

# In step 4 above, you are configuring your NestJS application to listen on port 3001
EXPOSE 3001

# Run the app with the required OpenTelemetry configuration.
CMD [ "nest", "start" ]
...
```