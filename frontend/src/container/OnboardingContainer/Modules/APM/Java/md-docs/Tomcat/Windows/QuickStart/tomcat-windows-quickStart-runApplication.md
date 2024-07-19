 Enable the instrumentation agent and run your application

If you run your `.war` package by putting in `webapps` folder, just add `setenv.bat` in your Tomcat `bin` folder.

This should set these environment variables and start sending telemetry data to SigNoz Cloud.


```bash
set CATALINA_OPTS=%CATALINA_OPTS% -javaagent:C:\path\to\opentelemetry-javaagent.jar
set OTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=SIGNOZ_INGESTION_KEY
set OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{region}.signoz.cloud:443
set OTEL_RESOURCE_ATTRIBUTES=service.name=<app_name>
```

- `<app_name>` is the name for your application
- `SIGNOZ_INGESTION_KEY` is the API token provided by SigNoz. You can find your ingestion key from SigNoz cloud account details sent on your email.

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

| Region | Endpoint |
| --- | --- |
| US |	ingest.us.signoz.cloud:443 |
| IN |	ingest.in.signoz.cloud:443 |
| EU | ingest.eu.signoz.cloud:443 |