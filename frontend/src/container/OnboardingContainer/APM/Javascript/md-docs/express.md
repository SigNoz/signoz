## Send Traces Directly to SigNoz

### Using the all-in-one auto-instrumentation library

The recommended way to instrument your Express application is to use the all-in-one auto-instrumentation library - `@opentelemetry/auto-instrumentations-node`. It provides a simple way to initialize multiple Nodejs instrumentations.

Internally, it calls the specific auto-instrumentation library for components used in the application. You can see the complete list [here](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node#supported-instrumentations).

#### Steps to auto-instrument Express application

1. Install the dependencies<br></br>
   We start by installing the relevant dependencies.

   ```bash
   npm install --save @opentelemetry/sdk-node
   npm install --save @opentelemetry/auto-instrumentations-node
   npm install --save @opentelemetry/exporter-trace-otlp-http
   ```

   The dependencies included are briefly explained below:<br></br>

   `@opentelemetry/sdk-node` - This package provides the full OpenTelemetry SDK for Node.js including tracing and metrics.<br></br>

   `@opentelemetry/auto-instrumentations-node` - This module provides a simple way to initialize multiple Node instrumentations.<br></br>

   `@opentelemetry/exporter-trace-otlp-http` - This module provides the exporter to be used with OTLP (`http/json`) compatible receivers.<br></br>

    <VersionPin />

2. **Create a `tracing.js` file**<br></br>
   The `tracing.js` file will contain the tracing setup code. Notice, that we have set some environment variables in the code(highlighted). You can update these variables based on your environment.

````jsx
  // tracing.js
  'use strict'
  const process = require('process');
  const opentelemetry = require('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const { Resource } = require('@opentelemetry/resources');
  const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

  const exporterOptions = {
    // highlight-next-line
    url: 'http://localhost:4318/v1/traces'
  }

  const traceExporter = new OTLPTraceExporter(exporterOptions);
  const sdk = new opentelemetry.NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    // highlight-start
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'node_app'
    })
    // highlight-end
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

  OpenTelemetry Node SDK currently does not detect the `OTEL_RESOURCE_ATTRIBUTES` from `.env` files as of today. That’s why we need to include the variables in the `tracing.js` file itself.

  About environment variables:

  `service_name` : node_app (you can give whatever name that suits you)

  `http://localhost:4318/v1/traces` is the default url for sending your tracing data. We are assuming you have installed SigNoz on your `localhost`. Based on your environment, you can update it accordingly. It should be in the following format:

  `http://<IP of SigNoz backend>:4318/v1/traces`

  Here’s a handy [grid](https://signoz.io/docs/instrumentation/troubleshoot-instrumentation/) to figure out which address to use to send data to SigNoz.

:::note
  Remember to allow incoming requests to port 4318 of machine where SigNoz backend is hosted.



3. **Run the application**<br></br>
The tracing configuration should be run before your application code. We will use the [`-r, —require module`](https://nodejs.org/api/cli.html#cli_r_require_module) flag for that.<br></br>

```jsx
  node -r ./tracing.js app.js
  ```

:::note
If you're running your nodejs application in PM2 cluster mode, it doesn't support node args: [Unitech/pm2#3227](https://github.com/Unitech/pm2/issues/3227). As above sample app instrumentation requires to load `tracing.js` before app load by passing node arg, so nodejs instrumentation doesn't work in PM2 cluster mode. So you need to import `tracing.js` in your main application. The `import ./tracing.js` should be the first line of your application code and initialize it before any other function. Here's the [sample github repo](https://github.com/SigNoz/sample-nodejs-app/tree/init-tracer-main) which shows the implementation.
:::

### Validating instrumentation by checking for traces

With your application running, you can verify that you’ve instrumented your application with OpenTelemetry correctly by confirming that tracing data is being reported to SigNoz.

To do this, you need to ensure that your application generates some data. Applications will not produce traces unless they are being interacted with, and OpenTelemetry will often buffer data before sending. So you need to interact with your application and wait for some time to see your tracing data in SigNoz.

Validate your traces in SigNoz:

1. Trigger an action in your app that generates a web request. Hit the endpoint a number of times to generate some data. Then, wait for some time.
2. In SigNoz, open the `Services` tab. Hit the `Refresh` button on the top right corner, and your application should appear in the list of `Applications`.
3. Go to the `Traces` tab, and apply relevant filters to see your application’s traces.

You might see other dummy applications if you’re using SigNoz for the first time. You can remove it by following the docs [here](https://signoz.io/docs/operate/docker-standalone/#remove-the-sample-application).

<figure data-zoomable align='center'>
  <img src="/img/docs/express_application_services_list.webp" alt="Nestjs Application in the list of services being monitored in SigNoz"/>
  <figcaption><i>Express Application in the list of services being monitored in SigNoz</i></figcaption>
</figure>

<br></br>

If you don't see your application reported in the list of services, try our [troubleshooting](https://signoz.io/docs/install/troubleshooting/) guide.


### Using a specific auto-instrumentation library

If you want to instrument only your Express framework, then you need to use the following package:

```jsx
npm install --save @opentelemetry/instrumentation-express
````

Note that in the above case, you will have to install packages for all the components that you want to instrument with OpenTelemetry individually. You can find detailed instructions [here](https://signoz.io/docs/instrumentation/javascript/#using-a-specific-auto-instrumentation-library).
