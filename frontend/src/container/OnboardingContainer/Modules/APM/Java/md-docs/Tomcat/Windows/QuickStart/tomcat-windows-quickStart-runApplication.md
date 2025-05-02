## Enable the instrumentation agent and run your application

If you run your `.war` package by putting in `webapps` folder, just add `setenv.bat` in your Tomcat `bin` folder.

This should set these environment variables and start sending telemetry data to SigNoz Cloud.

&nbsp;

```bash
set CATALINA_OPTS=%CATALINA_OPTS% -javaagent:C:\path\to\opentelemetry-javaagent.jar
set OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}
set OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443
set OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}}
```