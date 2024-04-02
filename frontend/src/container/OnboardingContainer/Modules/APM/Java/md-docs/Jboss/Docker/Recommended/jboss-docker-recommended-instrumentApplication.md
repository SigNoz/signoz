After setting up the Otel collector agent, follow the steps below to instrument your JavaScript Application

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
RUN sed -i 's/\(JAVA_OPTS=".*\)/\1 -javaagent:\/opt\/jboss-eap-7.1\/opentelemetry-javaagent.jar/' bin/standalone.conf
...
```

