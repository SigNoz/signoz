## Requirements

- Python 3.8 or newer

## Send Traces to SigNoz Cloud

Based on your application environment, you can choose the setup below to send traces to SigNoz Cloud.

### Application on VMs

From VMs, there are two ways to send data to SigNoz Cloud.

- Send traces directly to SigNoz Cloud (quick start)
- Send traces via OTel Collector binary (recommended)

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
OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.{{REGION}}.signoz.cloud:443" \
OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" \
opentelemetry-instrument <your_run_command>
```
- *`<your_run_command>`* can be `python3 app.py` or `flask run`

Note:
Don’t run app in reloader/hot-reload mode as it breaks instrumentation.

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

Step 3. To run your application and send data to collector in same VM

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc opentelemetry-instrument <your_run_command>
```

where,

- *`<your_run_command>`* can be `python3 app.py` or `flask run`

`http://localhost:4317` for gRPC exporter and `http://localhost:4318` for HTTP exporter.

The port numbers are 4317 and 4318 for the gRPC and HTTP exporters respectively.

In case you have OtelCollector Agent in different VM, replace localhost:4317 with `<IP Address of the VM>:4317`.

---


### Applications Deployed on Kubernetes

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

Step 3. Run your application

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc opentelemetry-instrument <your_run_command>
```

where,

- *`<your_run_command>`* can be `python3 app.py` or `flask run`


Step 4. Make sure to dockerise your application along with OpenTelemetry instrumentation.

---

## Troubleshooting

### Missing spans with Gunicorn/Uvicorn multiple workers

If you're running Gunicorn or Uvicorn with multiple workers and notice spans missing or not exporting, this is likely a forking issue.

#### The problem

Gunicorn and Uvicorn use `fork()` to create worker processes. The OpenTelemetry SDK gets initialized in the parent process before forking. After the fork, each worker has its own memory space, but the SDK state (spans, exporters, etc.) from the parent isn't properly inherited. This means spans created in workers often don't get exported.

#### Solutions

**Option 1: Single worker (dev/testing only)**

For development, you can just use one worker:

```bash
gunicorn --workers 1 app:app
# or
uvicorn app:app --workers 1
```

**Option 2: Reinitialize in each worker (production)**

For production with multiple workers, you need to reinitialize the OpenTelemetry SDK in each worker after forking. This usually means:

1. Using Gunicorn's `post_fork` hook or Uvicorn's worker initialization
2. Re-running the OpenTelemetry bootstrap in each worker
3. Making sure each worker has its own exporter instance

See the [OpenTelemetry Python multiprocessing docs](https://opentelemetry-python.readthedocs.io/en/latest/instrumentation/runtime.html#multiprocessing) for how to implement this.

**Option 3: Different deployment model**

Instead of in-process workers, consider:
- Kubernetes with multiple pod replicas (one worker per pod)
- Process managers like systemd or supervisor
- Horizontal scaling instead of multiple workers per process

#### More info

- [OpenTelemetry Python - Multiprocessing](https://opentelemetry-python.readthedocs.io/en/latest/instrumentation/runtime.html#multiprocessing)
- [Gunicorn Workers](https://docs.gunicorn.org/en/stable/design.html#how-many-workers)
- [Uvicorn Workers](https://www.uvicorn.org/deployment/#workers)