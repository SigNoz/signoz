## Send Traces Directly to SigNoz

### Using the all-in-one auto-instrumentation library

The recommended way to instrument your Nestjs application is to use the all-in-one auto-instrumentation library - `@opentelemetry/auto-instrumentations-node`. It provides a simple way to initialize multiple Nodejs instrumentations.

Internally, it calls the specific auto-instrumentation library for components used in the application. You can see the complete list [here](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node#supported-instrumentations).

#### Steps to auto-instrument Nestjs application

1. Install the dependencies<br></br>
   We start by installing the relevant dependencies.

   ```bash
   npm install --save @opentelemetry/sdk-node
   npm install --save @opentelemetry/auto-instrumentations-node
   npm install --save @opentelemetry/exporter-trace-otlp-http
   ```

    <NestjsPinnedVersions />

2. Create a `tracer.ts` file

   ```jsx
   'use strict';
   const process = require('process');
   //OpenTelemetry
   const opentelemetry = require('@opentelemetry/sdk-node');
   const {
   	getNodeAutoInstrumentations,
   } = require('@opentelemetry/auto-instrumentations-node');
   const {
   	OTLPTraceExporter,
   } = require('@opentelemetry/exporter-trace-otlp-http');
   const { Resource } = require('@opentelemetry/resources');
   const {
   	SemanticResourceAttributes,
   } = require('@opentelemetry/semantic-conventions');

   const exporterOptions = {
   	url: 'http://localhost:4318/v1/traces',
   };

   const traceExporter = new OTLPTraceExporter(exporterOptions);
   const sdk = new opentelemetry.NodeSDK({
   	traceExporter,
   	instrumentations: [getNodeAutoInstrumentations()],
   	resource: new Resource({
   		[SemanticResourceAttributes.SERVICE_NAME]: 'sampleNestjsApplication',
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

   module.exports = sdk;
   ```

3. Import the tracer module where your app starts

   ```jsx
   const tracer = require('./tracer');
   ```

4. Start the tracer<br></br>
   In the `async function boostrap` section of the application code, initialize the tracer as follows:

   ```jsx
   const tracer = require('./tracer');

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

   You can now run your Nestjs application. The data captured with OpenTelemetry from your application should start showing on the SigNoz dashboard.

### Validating instrumentation by checking for traces

With your application running, you can verify that you’ve instrumented your application with OpenTelemetry correctly by confirming that tracing data is being reported to SigNoz.

To do this, you need to ensure that your application generates some data. Applications will not produce traces unless they are being interacted with, and OpenTelemetry will often buffer data before sending. So you need to interact with your application and wait for some time to see your tracing data in SigNoz.

Validate your traces in SigNoz:

1. Trigger an action in your app that generates a web request. Hit the endpoint a number of times to generate some data. Then, wait for some time.
2. In SigNoz, open the `Services` tab. Hit the `Refresh` button on the top right corner, and your application should appear in the list of `Applications`.
3. Go to the `Traces` tab, and apply relevant filters to see your application’s traces.

You might see other dummy applications if you’re using SigNoz for the first time. You can remove it by following the docs [here](https://signoz.io/docs/operate/docker-standalone/#remove-the-sample-application).

<figure data-zoomable align='center'>
    <img src="/img/docs/nestjs_application_instrumented.webp" alt="Nestjs Application in the list of services being monitored in SigNoz"/>
    <figcaption><i>Nestjs Application in the list of services being monitored in SigNoz</i></figcaption>
</figure>

<br></br>

If you don't see your application reported in the list of services, try our [troubleshooting](https://signoz.io/docs/install/troubleshooting/) guide.

### Using a specific auto-instrumentation library

If you want to instrument only your Nestjs framework, then you need to use the following package:

```jsx
npm install --save @opentelemetry/instrumentation-nestjs-core
```

Note that in the above case, you will have to install packages for all the components that you want to instrument with OpenTelemetry individually. You can find detailed instructions [here](https://signoz.io/docs/instrumentation/javascript/#using-a-specific-auto-instrumentation-library).
