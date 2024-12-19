## Enable the instrumentation agent and run your application
&nbsp;

If you run your .war package by putting in webapps folder, just add setenv.sh in your Tomcat bin folder.
&nbsp;

This should set these environment variables and start sending telemetry data to SigNoz Cloud.

```bash
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/<path>/opentelemetry-javaagent.jar"
export OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}"
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443
export OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}}
```
&nbsp;

<path> - update it to the path where you downloaded the Java JAR agent in previous step

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/tomcat/#troubleshooting-your-installation) for assistance.

