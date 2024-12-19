#### Requirements
- Java 8 or higher
&nbsp;

### Create setenv.sh file

Create a `setenv.sh` file in the same directory as your Dockerfile

```bash
#!/bin/sh
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/usr/local/tomcat/opentelemetry-javaagent.jar"
export OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}"
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443
export OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}}
```

&nbsp;

### Dockerize your application

Update your Dockerfile with the below commands
```bash
...
# Set working directory. Here /usr/local/tomcat is assumed to be the working directory
WORKDIR /usr/local/tomcat

# Download otel java binary agent
RUN wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar -O opentelemetry-javaagent.jar

# Copy setenv.sh into Tomcat bin directory of the working directory to enable the instrumentation agent
COPY setenv.sh /usr/local/tomcat/bin/
...
```
