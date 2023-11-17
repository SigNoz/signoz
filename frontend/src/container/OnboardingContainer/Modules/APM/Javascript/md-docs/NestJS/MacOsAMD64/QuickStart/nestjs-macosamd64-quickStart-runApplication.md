After your instrumentation is done, start your application

```bash
OTEL_EXPORTER_OTLP_HEADERS="signoz-access-token={{SIGNOZ_INGESTION_KEY}}" nest start
```