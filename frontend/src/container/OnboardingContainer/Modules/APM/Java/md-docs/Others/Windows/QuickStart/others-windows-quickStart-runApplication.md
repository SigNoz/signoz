Run your application
&nbsp;

```bash
setx OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} 
setx OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" 
setx OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443 
```

&nbsp;
&nbsp;

```bash
java -javaagent:$PWD/opentelemetry-javaagent.jar -jar {{MYAPP}}.jar
```
