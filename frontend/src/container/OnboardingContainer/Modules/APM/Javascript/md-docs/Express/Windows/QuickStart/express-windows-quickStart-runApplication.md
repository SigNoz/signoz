Set `OTEL_EXPORTER_OTLP_ENDPOINT` as env variable using powershell:

```bash
$env:OTEL_EXPORTER_OTLP_ENDPOINT="<otlp_endpoint>"
```

**Run the application** <br></br>

```bash
node -r ./tracing.js app.js
```