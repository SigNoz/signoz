Run your application

```bash
setx OTEL_RESOURCE_ATTRIBUTES=service.name=<app_name> 
setx OTEL_EXPORTER_OTLP_HEADERS="signoz-access-token=SIGNOZ_INGESTION_KEY" 
setx OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{region}.signoz.cloud:443 
```

```bash
java -javaagent:$PWD/opentelemetry-javaagent.jar -jar <my-app>.jar
```

- `<app_name>` is the name for your application
- `SIGNOZ_INGESTION_KEY` is the API token provided by SigNoz. You can find your ingestion key from SigNoz cloud account details sent on your email.

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

| Region | Endpoint |
| --- | --- |
| US |	ingest.us.signoz.cloud:443 |
| IN |	ingest.in.signoz.cloud:443 |
| EU | ingest.eu.signoz.cloud:443 |
