### Running your PHP application

We will pass environment variables at the runtime: 

```bash
env OTEL_PHP_AUTOLOAD_ENABLED=true \
    OTEL_SERVICE_NAME={{MYAPP}} \
    OTEL_TRACES_EXPORTER=otlp \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443 \
    OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}} \
    OTEL_PROPAGATORS=baggage,tracecontext \
    <your-run-command>
```

- <your-run-command> - Run command for your PHP application
