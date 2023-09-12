## Send Traces to SigNoz Cloud

Based on your application environment, you can choose the setup below to send traces to SigNoz Cloud.

From VMs, there are two ways to send data to SigNoz Cloud.

- [Send traces directly to SigNoz Cloud](#send-traces-directly-to-signoz-cloud)
- [Send traces via OTel Collector binary](#send-traces-via-otel-collector-binary) (recommended)

#### **Send traces directly to SigNoz Cloud**

Step 1. Install the OpenTelemetry dependencies

```bash
pip install opentelemetry-distro==0.38b0
pip install opentelemetry-exporter-otlp==1.17.0
```

Step 2. Add automatic instrumentation

```bash
opentelemetry-bootstrap --action=install
```

Step 3. Run your application

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name=<service_name> \
OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.{region}.signoz.cloud:443" \
OTEL_EXPORTER_OTLP_HEADERS="signoz-access-token=SIGNOZ_INGESTION_KEY" \
opentelemetry-instrument <your_run_command>
```

- *`<service_name>`* is the name of the service you want
- *`<your_run_command>`* can be `python3 app.py` or `flask run`
- Replace `SIGNOZ_INGESTION_KEY` with the api token provided by SigNoz. You can find it in the email sent by SigNoz with your cloud account details.

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

| Region | Endpoint                   |
| ------ | -------------------------- |
| US     | ingest.us.signoz.cloud:443 |
| IN     | ingest.in.signoz.cloud:443 |
| EU     | ingest.eu.signoz.cloud:443 |

Step 4. Validate if your application is sending traces to SigNoz cloud by following the instructions [here](#validating-instrumentation-by-checking-for-traces).

---

#### **Send traces via OTel Collector binary**

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Python application.

Step 1. Install the OpenTelemetry dependencies

```bash
pip install opentelemetry-distro==0.38b0
pip install opentelemetry-exporter-otlp==1.17.0
```

Step 2. Add automatic instrumentation

```bash
opentelemetry-bootstrap --action=install
```

Step 3. To run your application and send data to collector in same VM:

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name=<service_name> \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
opentelemetry-instrument <your_run_command>
```

where,

- *`<service_name>`* is the name of the service you want
- *`<your_run_command>`* can be `python3 app.py` or `flask run`

In case you have OtelCollector Agent in different VM, replace localhost:4317 with `<IP Address of the VM>:4317`.

Step 4. You can validate if your application is sending traces to SigNoz cloud by following the instructions [here](#validating-instrumentation-by-checking-for-traces).

For Python application deployed on Kubernetes, you need to install OTel Collector agent in your k8s infra to collect and send traces to SigNoz Cloud. You can find the instructions to install OTel Collector agent [here](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/).

Once you have set up OTel Collector agent, you can proceed with OpenTelemetry Python instrumentation by following the below steps:

Step 1. Install the OpenTelemetry dependencies

```bash
pip install opentelemetry-distro==0.38b0
pip install opentelemetry-exporter-otlp==1.17.0
```

Step 2. Add automatic instrumentation

```bash
opentelemetry-bootstrap --action=install
```

Step 3. Run your application:

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name=<service_name> \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
opentelemetry-instrument <your_run_command>
```

where,

- *`<service_name>`* is the name of the service you want
- *`<your_run_command>`* can be `python3 app.py` or `flask run`

Step 4. Make sure to dockerise your application along with OpenTelemetry instrumentation.

You can validate if your application is sending traces to SigNoz cloud by following the instructions [here](#validating-instrumentation-by-checking-for-traces).
