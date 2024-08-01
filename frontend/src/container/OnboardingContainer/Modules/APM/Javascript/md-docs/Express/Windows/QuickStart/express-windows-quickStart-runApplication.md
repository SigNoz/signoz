Set `OTEL_EXPORTER_OTLP_ENDPOINT` as env variable using powershell:

&nbsp;

```bash
$env:OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.{{REGION}}.signoz.cloud:443/v1/traces"
```

**Run the application** <br></br>

```bash
node -r ./tracing.js app.js
```