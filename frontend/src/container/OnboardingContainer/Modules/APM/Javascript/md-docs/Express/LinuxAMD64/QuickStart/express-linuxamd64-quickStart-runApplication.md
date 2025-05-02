&nbsp;

Once you are done intrumenting your JavaScript application, you can run it using the below command

```bash
OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" node -r ./tracing.js app.js
```

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/express/#troubleshooting-your-installation) for assistance.