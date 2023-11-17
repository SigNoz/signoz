### Enable the instrumentation agent and run your application

If you run your .war package by putting in webapps folder, just add setenv.sh in your Tomcat bin folder.

This should set these environment variables and start sending telemetry data to SigNoz Cloud.

```bash
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/<path>/opentelemetry-javaagent.jar"
export OTEL_EXPORTER_OTLP_HEADERS="signoz-access-token={{SIGNOZ_INGESTION_KEY}}"
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443
export OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}}
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step
