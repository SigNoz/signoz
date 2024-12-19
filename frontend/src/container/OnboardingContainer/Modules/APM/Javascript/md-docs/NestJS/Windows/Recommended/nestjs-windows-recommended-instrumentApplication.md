&nbsp;

After setting up the Otel collector agent, follow the steps below to instrument your JavaScript Application

#### Requirements
- Supported Versions >= `4.0.0`
&nbsp;

**Step 1.** Install OpenTelemetry packages

```js
npm install --save @opentelemetry/api@^1.6.0
npm install --save @opentelemetry/sdk-node@^0.45.0
npm install --save @opentelemetry/auto-instrumentations-node@^0.39.4
npm install --save @opentelemetry/exporter-trace-otlp-http@^0.45.0
```

&nbsp;

**Step 2.** Create `tracer.ts` file<br></br>

```ts
'use strict';

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import * as opentelemetry from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Configure the SDK to export telemetry data to the console
// Enable all auto-instrumentations from the meta package
const exporterOptions = {
  //highlight-start
  url: 'http://localhost:4318/v1/traces',
  //highlight-end
};

const traceExporter = new OTLPTraceExporter(exporterOptions);
const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: '<service_name>',
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
&nbsp;

- `<service_name>` : Name of your service.

**Step 3.** On `main.ts` file or file where your app starts import tracer using below command. 
<Admonition type="info">
The below import should be the first line in the main file of your application (Ex -> `main.ts`)
</Admonition>
    
```jsx
const tracer = require('./tracer')
```
    

**Step 4.** Start the tracer<br></br>
In the `async function boostrap` section of the application code, initialize the tracer as follows: 

```jsx
const tracer = require('./tracer')

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
  // All of your application code and any imports that should leverage
  // OpenTelemetry automatic instrumentation must go here.

async function bootstrap() {
    // highlight-start
    await tracer.start();
    //highlight-end
    const app = await NestFactory.create(AppModule);
    await app.listen(3001);
  }
  bootstrap();
```