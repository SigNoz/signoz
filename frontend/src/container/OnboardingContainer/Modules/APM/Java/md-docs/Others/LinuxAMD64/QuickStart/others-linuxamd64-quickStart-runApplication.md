
Once you are done intrumenting your Java application, you can run it using the below command

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} \
OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" \
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443 \
java -javaagent:<path>/opentelemetry-javaagent.jar -jar <my-app>.jar
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step
<my-app> - Jar file of your application

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/java/#troubleshooting-your-installation) for assistance.

