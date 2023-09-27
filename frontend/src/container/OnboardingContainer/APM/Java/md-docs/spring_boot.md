## Requirements

Java 8 or higher

## Send Traces to SigNoz Cloud

OpenTelemetry provides a handy Java JAR agent that can be attached to any Java 8+ application and dynamically injects bytecode to capture telemetry from a number of popular libraries and frameworks.

Based on your application environment, you can choose the setup below to send traces to SigNoz Cloud.

### Application on VMs

From VMs, there are two ways to send data to SigNoz Cloud.

- [Send traces directly to SigNoz Cloud](#send-traces-directly-to-signoz-cloud)
- [Send traces via OTel Collector binary](#send-traces-via-otel-collector-binary) (recommended)

#### **Send traces directly to SigNoz Cloud**
OpenTelemetry Java agent can send traces directly to SigNoz Cloud.
  
Step 1. Download otel java binary agent

```bash
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

Step 2. Run your application

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name=<myapp> \
OTEL_EXPORTER_OTLP_HEADERS="signoz-access-token=<SIGNOZ_INGESTION_KEY>" \
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{region}.signoz.cloud:443 \
java -javaagent:<path>/opentelemetry-javaagent.jar -jar <myapp>.jar
```
- `<myapp>` is the name for your application
- `<path>` - update it to the path of your downloaded Java JAR agent
- `<SIGNOZ_INGESTION_KEY>` is the API token provided by SigNoz. You can find your ingestion key from SigNoz cloud account details sent on your email.

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

 US -	ingest.us.signoz.cloud:443 

 IN -	ingest.in.signoz.cloud:443 

 EU - ingest.eu.signoz.cloud:443 

---

#### **Send traces via OTel Collector binary**

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Java application.

Step 1. Download OTel java binary agent
```bash
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

Step 2. Run your application

```bash
java -javaagent:<path>/opentelemetry-javaagent.jar -jar <myapp>.jar
```

- `<myapp>` is the name of your application
- `<path>` - update it to the path of your downloaded Java JAR agent
  
---

### Applications Deployed on Kubernetes

For Java application deployed on Kubernetes, you need to install OTel Collector agent in your k8s infra to collect and send traces to SigNoz Cloud. You can find the instructions to install OTel Collector agent [here](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/).

Once you have set up OTel Collector agent, you can proceed with OpenTelemetry java instrumentation by following the below steps:

1. Download otel java binary

   ```bash
   wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
   ```

2. Run your application
   
   ```bash
   java -javaagent:<path>/opentelemetry-javaagent.jar -jar <myapp>.jar
   ```

   - `<myapp>` is the name of your application
   - `<path>` - update it to the path of your downloaded Java JAR agent

3. Make sure to dockerise your application along with OpenTelemetry instrumentation.