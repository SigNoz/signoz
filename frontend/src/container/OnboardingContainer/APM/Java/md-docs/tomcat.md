## Send Traces to SigNoz Cloud

OpenTelemetry provides a handy Java JAR agent that can be attached to any Java 8+ application and dynamically injects bytecode to capture telemetry from a number of popular libraries and frameworks.

Based on your application environment, you can choose the setup below to send traces to SigNoz Cloud.

From VMs, there are two ways to send data to SigNoz Cloud.

- [Send traces directly to SigNoz Cloud](#send-traces-directly-to-signoz-cloud)
- [Send traces via OTel Collector binary](#send-traces-via-otel-collector-binary) (recommended)

#### **Send traces directly to SigNoz Cloud**

OpenTelemetry Java agent can send traces directly to SigNoz Cloud.

Step 1. Download otel java binary agent

```bash
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

Step 2. Enable the instrumentation agent and run your application

If you run your `.war` package by putting in `webapps` folder, just add `setenv.sh` in your Tomcat `bin` folder.

This should set these environment variables and start sending telemetry data to SigNoz Cloud.

```bash
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/path/to/opentelemetry-javaagent.jar"
export OTEL_EXPORTER_OTLP_HEADERS="signoz-access-token=SIGNOZ_INGESTION_KEY"
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{region}.signoz.cloud:443
export OTEL_RESOURCE_ATTRIBUTES=service.name=<app_name>
```

- `<app_name>` is the name for your application
- `SIGNOZ_INGESTION_KEY` is the API token provided by SigNoz. You can find your ingestion key from SigNoz cloud account details sent on your email.

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

| Region | Endpoint                   |
| ------ | -------------------------- |
| US     | ingest.us.signoz.cloud:443 |
| IN     | ingest.in.signoz.cloud:443 |
| EU     | ingest.eu.signoz.cloud:443 |

---

#### **Send traces via OTel Collector binary**

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Java application.

Step 1. Download OTel java binary agent<br></br>

```bash
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

Step 2. Enable the instrumentation agent and run your application<br></br>

If you run your `.war` package by putting in `webapps` folder, just add `setenv.sh` in your Tomcat `bin` folder.

This should set these environment variables and start sending telemetry data to SigNoz Cloud.

```bash
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/path/to/opentelemetry-javaagent.jar"
```

- path/to - Update it to the path of your downloaded Java JAR agent.

For Java application deployed on Kubernetes, you need to install OTel Collector agent in your k8s infra to collect and send traces to SigNoz Cloud. You can find the instructions to install OTel Collector agent [here](/docs/tutorial/kubernetes-infra-metrics/).

Once you have set up OTel Collector agent, you can proceed with OpenTelemetry java instrumentation by following the below steps:

1. Download otel java binary<br></br>

   ```bash
   wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
   ```

2. Enable the instrumentation agent and run your application<br></br>

   If you run your `.war` package by putting in `webapps` folder, just add `setenv.sh` in your Tomcat `bin` folder.

   This should set the environment variable and start sending telemetry data to SigNoz Cloud.

   ```bash
   export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/path/to/opentelemetry-javaagent.jar"
   ```

   - path/to - Update it to the path of your downloaded Java JAR agent.

3. Make sure to dockerise your application along with OpenTelemetry instrumentation.

You can validate if your application is sending traces to SigNoz cloud by following the instructions [here](#validating-instrumentation-by-checking-for-traces).
