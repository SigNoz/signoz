## Requirements

- Python 3.8 or newer

- for Django, you must define `DJANGO_SETTINGS_MODULE`correctly. If your project is called `mysite`, something like following should work:

   ```bash
   export DJANGO_SETTINGS_MODULE=mysite.settings
   ```

  Please refer the official [Django docs](https://docs.djangoproject.com/en/1.10/topics/settings/#designating-the-settings) for more details.


## Send Traces to SigNoz Cloud

Based on your application environment, you can choose the setup below to send traces to SigNoz Cloud.

### Application on VMs

From VMs, there are two ways to send data to SigNoz Cloud.

- [Send traces directly to SigNoz Cloud](#send-traces-directly-to-signoz-cloud)
- [Send traces via OTel Collector binary](#send-traces-via-otel-collector-binary) (recommended)

#### **Send traces directly to SigNoz Cloud**

Step 1. Create a virtual environment<br></br>
    
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Step 2. Install the OpenTelemetry dependencies

```bash
pip install opentelemetry-distro==0.38b0
pip install opentelemetry-exporter-otlp==1.17.0
```

<!-- The dependencies included are briefly explained below:

`opentelemetry-distro` - The distro provides a mechanism to automatically configure some of the more common options for users. It helps to get started with OpenTelemetry auto-instrumentation quickly. 

`opentelemetry-exporter-otlp` - This library provides a way to install all OTLP exporters. You will need an exporter to send the data to SigNoz.

:::note
💡 The `opentelemetry-exporter-otlp` is a convenience wrapper package to install all OTLP exporters. Currently, it installs:

- opentelemetry-exporter-otlp-proto-http
- opentelemetry-exporter-otlp-proto-grpc

- (soon) opentelemetry-exporter-otlp-json-http

The `opentelemetry-exporter-otlp-proto-grpc` package installs the gRPC exporter which depends on the `grpcio` package. The installation of `grpcio` may fail on some platforms for various reasons. If you run into such issues, or you don't want to use gRPC, you can install the HTTP exporter instead by installing the `opentelemetry-exporter-otlp-proto-http` package. You need to set the `OTEL_EXPORTER_OTLP_PROTOCOL` environment variable to `http/protobuf` to use the HTTP exporter.
::: -->

Step 3. Add automatic instrumentation

```bash
opentelemetry-bootstrap --action=install
```

Please make sure that you have installed all the dependencies of your application before running the above command. The command will not install instrumentation for the dependencies which are not installed.

Step 4. Run your application

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name=<service_name> \
OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.{region}.signoz.cloud:443" \
OTEL_EXPORTER_OTLP_HEADERS="signoz-access-token=SIGNOZ_INGESTION_KEY" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc \
opentelemetry-instrument <your_run_command>
```

- `<service_name>` is the name of the service you want
- <your_run_command> can be `python3 app.py` or `python manage.py runserver --noreload`
- Replace `SIGNOZ_INGESTION_KEY` with the api token provided by SigNoz. You can find it in the email sent by SigNoz with your cloud account details.

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

 US -	ingest.us.signoz.cloud:443 <br></br>

 IN -	ingest.in.signoz.cloud:443 <br></br>

 EU - ingest.eu.signoz.cloud:443 <br></br>

Note:
Don’t run app in reloader/hot-reload mode as it breaks instrumentation. For example, you can disable the auto reload with `--noreload`.

---

#### **Send traces via OTel Collector binary**

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Python application.

Step 1. Create a virtual environment<br></br>
    
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

Step 4. To run your application and send data to collector in same VM:

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name=<service_name> \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc opentelemetry-instrument <your run command>
```

- <service_name> is the name of service you want

- <your_run_command>* can be `python3 app.py` or `python manage.py runserver --noreload`

- `http://localhost:4317` for gRPC exporter and `http://localhost:4318` for HTTP exporter.


In case you have OtelCollector Agent in different VM, replace localhost:4317 with `<IP Address of the VM>:4317`.


---

### Applications Deployed on Kubernetes

For Python application deployed on Kubernetes, you need to install OTel Collector agent in your k8s infra to collect and send traces to SigNoz Cloud. You can find the instructions to install OTel Collector agent [here](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/).

Once you have set up OTel Collector agent, you can proceed with OpenTelemetry Python instrumentation by following the below steps:

Step 1. Create a virtual environment<br></br>
    
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

Step 4. Run your application:

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name=<service_name> \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc opentelemetry-instrument <your run command>
```

<service_name> is the name of service you want

<your_run_command> can be `python3 app.py` or `python manage.py runserver --noreload`

`http://localhost:4317` for gRPC exporter and `http://localhost:4318` for HTTP exporter.

Note:
The port numbers are 4317 and 4318 for the gRPC and HTTP exporters respectively.


In case you have OtelCollector Agent in different VM, replace localhost:4317 with `<IP Address of the VM>:4317`.

Step 5. Make sure to dockerise your application along with OpenTelemetry instrumentation.

