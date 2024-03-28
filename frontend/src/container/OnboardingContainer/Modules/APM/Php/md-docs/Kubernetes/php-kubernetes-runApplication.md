### Set environment variables and run app

We will pass environment variables at the runtime: 

```bash
env OTEL_PHP_AUTOLOAD_ENABLED=true \
    OTEL_SERVICE_NAME={MYAPP} \
    OTEL_TRACES_EXPORTER=otlp \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_EXPORTER_OTLP_ENDPOINT=<COLLECTOR_ENDPOINT> \
    OTEL_PROPAGATORS=baggage,tracecontext \
    <your-run-command>
```

- <COLLECTOR_ENDPOINT> - Endpoint at which the collector is running. Ex. -> `http://localhost:4317`
- <your-run-command> - Run command for your PHP application