## Instrumenting your Angular App with OpenTelemetry 🛠

#### Pre-requisites

Enable CORS in the OTel Receiver. Inside `docker/clickhouse-setup/otel-collector-config.yaml` add the following CORS config. You can view the file at [SigNoz GitHub repo](https://github.com/SigNoz/signoz/blob/develop/deploy/docker/clickhouse-setup/otel-collector-config.yaml).

```yml
      http:
+        cors:
+          allowed_origins:
+            - https://netflix.com  # URL of your Frontend application
```

> Make sure to restart the container after making the config changes

Now let's get back to instrumenting our Angular Application. Let's start by installing a couple of dependencies.

```sh
npm i @jufab/opentelemetry-angular-interceptor && npm i @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/sdk-trace-base @opentelemetry/core @opentelemetry/semantic-conventions @opentelemetry/resources @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-zipkin @opentelemetry/propagator-b3 @opentelemetry/propagator-jaeger @opentelemetry/context-zone-peer-dep @opentelemetry/instrumentation @opentelemetry/instrumentation-document-load @opentelemetry/instrumentation-fetch @opentelemetry/instrumentation-xml-http-request @opentelemetry/propagator-aws-xray --save-dev
```

Not let's import OTel module in `app.module.ts`

```ts
import {
  OpenTelemetryInterceptorModule,
  OtelColExporterModule,
  CompositePropagatorModule,
} from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  ...
  imports: [
    ...
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        console: true, // Display trace on console (only in DEV env)
        production: false, // Send Trace with BatchSpanProcessor (true) or SimpleSpanProcessor (false)
        serviceName: 'Angular Sample App', // Service name send in trace
        probabilitySampler: '1',
      },
      otelcolConfig: {
        url: 'http://127.0.0.1:4318/v1/traces', // URL of opentelemetry collector
      },
    }),
    //Insert OtelCol exporter module
    OtelColExporterModule,
    //Insert propagator module
    CompositePropagatorModule,
  ],
  ...
})
```

This config would be enough to get you up and running. For more tweaks refer to [this](https://github.com/jufab/opentelemetry-angular-interceptor#readme) detailed documentation of the instrumentation library.

Facing difficulties with instrumenting your application? Check out this video tutorial 👇
