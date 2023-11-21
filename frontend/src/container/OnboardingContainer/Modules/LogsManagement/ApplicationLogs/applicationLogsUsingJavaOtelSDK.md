# Collecting Application Logs Using OTEL Java Agent

You can directly send your application logs to SigNoz using Java Agent provided by opentlemetry.
In this blog we will run a sample java application and send the application logs to SigNoz.

For collecting logs we will have to download the java agent from [here](https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar).

To sends logs from a Java application you will have to add the agent and add the environment variables for the agent

The command for it will look like

```bash
OTEL_LOGS_EXPORTER=otlp OTEL_EXPORTER_OTLP_ENDPOINT="http://<IP of SigNoz Backend>:4317" OTEL_RESOURCE_ATTRIBUTES=service.name=<app_name> java -javaagent:/path/opentelemetry-javaagent.jar -jar  <myapp>.jar
```



In the below example we will configure a java application to send logs to SigNoz.

## How to Collect Application Logs Using OTEL Java Agent?

- Clone this [repository](https://github.com/SigNoz/spring-petclinic)
- Build the application using `./mvnw package`
- Now run the application

  ```
  OTEL_LOGS_EXPORTER=otlp OTEL_EXPORTER_OTLP_ENDPOINT="http://<host>:4317" OTEL_RESOURCE_ATTRIBUTES=service.name=myapp java -javaagent:/path/opentelemetry-javaagent.jar -jar target/*.jar
  ```

  You will have to replace your the value of `host` as `0.0.0.0` if SigNoz is running in the same host, for other configurations please check the
  [troubleshooting](../install/troubleshooting.md#signoz-otel-collector-address-grid) guide.

- Now if the application starts successfully the logs will be visible on SigNoz UI.
