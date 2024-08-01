
### Step 1: Install OpenTelemetry packages

```bash
npm install --save @opentelemetry/context-zone
npm install --save @opentelemetry/instrumentation
npm install --save @opentelemetry/auto-instrumentations-web
npm install --save @opentelemetry/sdk-trace-base
npm install --save @opentelemetry/sdk-trace-web
npm install --save @opentelemetry/resources
npm install --save @opentelemetry/semantic-conventions
npm install --save @opentelemetry/exporter-trace-otlp-http
```
&nbsp;

### Step 2: Create tracing.js file

```javascript
// tracing.js
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const provider = new WebTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: '{{MYAPP}}',
    }),
});
const exporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
});
provider.addSpanProcessor(new BatchSpanProcessor(exporter));

provider.register({
    // Changing default contextManager to use ZoneContextManager - supports asynchronous operations so that traces are not broken
    contextManager: new ZoneContextManager(),
});

// Registering instrumentations
registerInstrumentations({
    instrumentations: [
        getWebAutoInstrumentations({
                        
            '@opentelemetry/instrumentation-xml-http-request': {
                propagateTraceHeaderCorsUrls: [
                    /.+/g, //Regex to match your backend urls.
                ],
            },
            '@opentelemetry/instrumentation-fetch': {
                propagateTraceHeaderCorsUrls: [
                    /.+/g, //Regex to match your backend urls.
                ],
            },
        }),
    ],
});
```

&nbsp;

### Step 3: Import tracer in main file

**Important Note**: The below import should be the first line in the main file of your application (Ex -> `index.js`)
```bash
import './tracing.js'
```
