### Running your Ruby application

Run the application using the below:

```bash
OTEL_EXPORTER=otlp \
OTEL_SERVICE_NAME={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443 \
OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}} \
rails server
```