#### Requirements
- Java 8 or higher

&nbsp;

### Dockerize your application

Update your Dockerfile to include

```bash
...
# Set working directory. Assuming `/opt/jboss-eap-7.1` to be your working directory.
WORKDIR /opt/jboss-eap-7.1

# Download otel java binary agent
RUN wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar -O opentelemetry-javaagent.jar

# Open and update the configuration file
RUN sed -i 's/\(JAVA_OPTS=".*\)/\1 -javaagent:\/opt\/jboss-eap-7.1\/opentelemetry-javaagent.jar \
-Dotel.exporter.otlp.endpoint=https:\/\/ingest.{{REGION}}.signoz.cloud:443 \
-Dotel.exporter.otlp.headers="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" \
-Dotel.resource.attributes="service.name={{MYAPP}}"/' /opt/jboss-eap-7.1/bin/standalone.conf
...
```

