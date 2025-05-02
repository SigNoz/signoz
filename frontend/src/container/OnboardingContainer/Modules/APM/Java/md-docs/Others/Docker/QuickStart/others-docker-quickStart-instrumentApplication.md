#### Requirements
- Java 8 or higher
&nbsp;

### Dockerize your application

Add the following to your Dockerfile

```bash
...
# Download otel java binary agent using 
RUN wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar -O opentelemetry-javaagent.jar

# Set environment variables and run your Spring Boot application
ENV OTEL_RESOURCE_ATTRIBUTES="service.name={{MYAPP}}" \
    OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" \
    OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.{{REGION}}.signoz.cloud:443"

# Copy the Spring Boot application JAR file into the container
COPY <my-app>.jar /app

# Command to run the Spring Boot application
CMD ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-jar", "/app/<my-app>.jar"]
...
```


