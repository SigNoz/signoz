## Requirements

- Python 3.8 or newer

## Send Traces to SigNoz Cloud

Based on your application environment, you can choose the setup below to send traces to SigNoz Cloud.

### Application on VMs

From VMs, there are two ways to send data to SigNoz Cloud.

- Send traces directly to SigNoz Cloud (quick start)
- Send traces via OTel Collector binary (recommended)

#### **Send traces directly to SigNoz Cloud**

Step 1. Create a virtual environment
    
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Step 2. Install the OpenTelemetry dependencies

```bash
pip install opentelemetry-distro==0.38b0
pip install opentelemetry-exporter-otlp==1.17.0
```

Step 3. Add automatic instrumentation

```bash
opentelemetry-bootstrap --action=install
```

Please make sure that you have installed all the dependencies of your application before running the above command. The command will not install instrumentation for the dependencies which are not installed.

Step 4. Run your application

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.{{REGION}}.signoz.cloud:443" \
OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc \
opentelemetry-instrument <your_run_command>
```

- *<your_run_command>* can be `python3 app.py` or `gunicorn src.app -b 0.0.0.0:8001`

Note:
Don’t run app in reloader/hot-reload mode as it breaks instrumentation. For example, you can disable the auto reload with `--noreload`.

---

#### **Send traces via OTel Collector binary**

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Python application.

Step 1. Create a virtual environment
    
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Step 2. Install the OpenTelemetry dependencies

```bash
pip install opentelemetry-distro==0.38b0
pip install opentelemetry-exporter-otlp==1.17.0
```

Step 3. Add automatic instrumentation

```bash
opentelemetry-bootstrap --action=install
```
Please make sure that you have installed all the dependencies of your application before running the above command. The command will not install instrumentation for the dependencies which are not installed.

Step 4. To run your application and send data to collector in same VM

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc opentelemetry-instrument <your_run_command>
```

Note:
Don’t run app in reloader/hot-reload mode as it breaks instrumentation.

*<your_run_command>* can be `python3 app.py` or `flask run`

`http://localhost:4317` for gRPC exporter and `http://localhost:4318` for HTTP exporter.

Note:
The port numbers are 4317 and 4318 for the gRPC and HTTP exporters respectively.

In case you have OtelCollector Agent in different VM, replace localhost:4317 with `<IP Address of the VM>:4317`.

---

### Applications Deployed on Kubernetes

For Python application deployed on Kubernetes, you need to install OTel Collector agent in your k8s infra to collect and send traces to SigNoz Cloud. You can find the instructions to install OTel Collector agent [here](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/).

Once you have set up OTel Collector agent, you can proceed with OpenTelemetry Python instrumentation by following the below steps:

Step 1. Create a virtual environment
    
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Step 2. Install the OpenTelemetry dependencies

```bash
pip install opentelemetry-distro==0.38b0
pip install opentelemetry-exporter-otlp==1.17.0
```

Step 3. Add automatic instrumentation

```bash
opentelemetry-bootstrap --action=install
```

Please make sure that you have installed all the dependencies of your application before running the above command. The command will not install instrumentation for the dependencies which are not installed.

Step 4. Run your application

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc opentelemetry-instrument <your_run_command>
```

Note:
Don’t run app in reloader/hot-reload mode as it breaks instrumentation.

*<your_run_command>* can be `python3 app.py` or `flask run`

`http://localhost:4317` for gRPC exporter and `http://localhost:4318` for HTTP exporter.

Note:
The port numbers are 4317 and 4318 for the gRPC and HTTP exporters respectively.

In case you have OtelCollector Agent in different VM, replace localhost:4317 with `<IP Address of the VM>:4317`.

Step 5. Make sure to dockerise your application along with OpenTelemetry instrumentation.