&nbsp;
To run your Go Gin application, use the below command :

```bash
SERVICE_NAME={{MYAPP}} INSECURE_MODE=false OTEL_EXPORTER_OTLP_HEADERS=signoz-access-token={{SIGNOZ_INGESTION_KEY}} OTEL_EXPORTER_OTLP_ENDPOINT=ingest.{{REGION}}.signoz.cloud:443 go run main.go
```