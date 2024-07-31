After setting up the Otel collector agent, follow the steps below to instrument your Angular Application.

&nbsp;

**Step 1.** Install OpenTelemetry packages

```bash
npm install --save @opentelemetry/sdk-trace-web@^1.21.0                                                                   
npm install --save @opentelemetry/instrumentation@^0.48.0
npm install --save @opentelemetry/auto-instrumentations-web@^0.36.0
npm install --save @opentelemetry/exporter-trace-otlp-http@^0.48.0
npm install --save @opentelemetry/resources@^1.21.0
npm install --save @opentelemetry/propagator-b3@^1.21.0
npm install --save @opentelemetry/semantic-conventions@^1.21.0
```
&nbsp;

**Step 2.** Create `instrument.ts` file<br></br>

```bash
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
  WebTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: '<service_name>',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
  })
);

const provider = new WebTracerProvider({ resource });

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

provider.addSpanProcessor(
  new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
    })
  )
);

provider.register({
  propagator: new B3Propagator(),
});

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-document-load': {},
      '@opentelemetry/instrumentation-user-interaction': {},
      '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: /.+/,
      },
      '@opentelemetry/instrumentation-xml-http-request': {
        propagateTraceHeaderCorsUrls: /.+/,
      },
    }),
  ],
});
```

&nbsp;
&nbsp;

- `<service_name>` : Name of your service.

**Step 3.** Add the below import to your `main.ts` file.

```bash
import './app/instrument';
```