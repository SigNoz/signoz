After setting up the Otel collector agent, follow the steps below to instrument your Java Application

#### Requirements
- Java 8 or higher
&nbsp;

### Dockerize your application

Add the following to your Dockerfile

```bash
...
# Download otel java binary agent using 
RUN wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar -O opentelemetry-javaagent.jar

# Copy the Spring Boot application JAR file into the container
COPY <my-app>.jar /app

# Command to run the Spring Boot application
CMD ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-jar", "/app/<my-app>.jar"]
...
```
