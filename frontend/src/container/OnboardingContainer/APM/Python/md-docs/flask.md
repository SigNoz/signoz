## Send Traces Directly to SigNoz

You can use OpenTelemetry to send your traces directly to SigNoz. OpenTelemetry provides a handy distro in Python that can help you get started with automatic instrumentation. We recommend using it to get started quickly.

### Steps to auto-instrument Flask app for traces

1. **Create a virtual environment**<br></br>

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install the OpenTelemetry dependencies**<br></br>

   ```bash
   pip install opentelemetry-distro
   pip install opentelemetry-exporter-otlp
   ```

   The dependencies included are briefly explained below:

   `opentelemetry-distro` - The distro provides a mechanism to automatically configure some of the more common options for users. It helps to get started with OpenTelemetry auto-instrumentation quickly.

   `opentelemetry-exporter-otlp` - This library provides a way to install all OTLP exporters. You will need an exporter to send the data to SigNoz.

   :::note
   💡 The `opentelemetry-exporter-otlp` is a convenience wrapper package to install all OTLP exporters. Currently, it installs:

   - opentelemetry-exporter-otlp-proto-http
   - opentelemetry-exporter-otlp-proto-grpc

   - (soon) opentelemetry-exporter-otlp-json-http

   The `opentelemetry-exporter-otlp-proto-grpc` package installs the gRPC exporter which depends on the `grpcio` package. The installation of `grpcio` may fail on some platforms for various reasons. If you run into such issues, or you don't want to use gRPC, you can install the HTTP exporter instead by installing the `opentelemetry-exporter-otlp-proto-http` package. You need to set the `OTEL_EXPORTER_OTLP_PROTOCOL` environment variable to `http/protobuf` to use the HTTP exporter.
   :::

3. **Add automatic instrumentation**<br></br>
   The below command inspects the dependencies of your application and installs the instrumentation packages relevant for your Flask application.

   ```bash
   opentelemetry-bootstrap --action=install
   ```

   :::note
   Please make sure that you have installed all the dependencies of your application before running the above command. The command will not install instrumentation for the dependencies which are not installed.
   :::

4. **Run your application**<br></br>
   In the final run command, you can configure environment variables and flags. Flags for exporters:<br></br>

   For running your application, there are a few things that you need to keep in mind. Below are the notes:
   :::note
   Don’t run app in reloader/hot-reload mode as it breaks instrumentation. For example, if you use `export Flask_ENV=development`, it enables the reloader mode which breaks OpenTelemetry instrumentation.
   :::

   For running applications with application servers which are based on [pre fork model](#running-applications-with-gunicorn-uwsgi), like Gunicorn, uWSGI you have to add a post_fork hook or a @postfork decorator in your configuration.

   To start sending data to SigNoz, use the following run command:

   ```bash
   OTEL_RESOURCE_ATTRIBUTES=service.name=<service_name> OTEL_EXPORTER_OTLP_ENDPOINT="http://<IP of SigNoz Backend>:4317" OTEL_EXPORTER_OTLP_PROTOCOL=grpc opentelemetry-instrument <your run command>
   ```

   *<service_name>* is the name of service you want

   *<your_run_command>* can be `python3 app.py` or `flask run`

   `IP of SigNoz backend` is the IP of the machine where you installed SigNoz. If you have installed SigNoz on `localhost`, the endpoint will be `http://localhost:4317` for gRPC exporter and `http://localhost:4318` for HTTP exporter.

   :::note
   The port numbers are 4317 and 4318 for the gRPC and HTTP exporters respectively. Remember to allow incoming requests to port **4317**/**4318** of machine where SigNoz backend is hosted.
   :::

### Validating instrumentation by checking for traces

With your application running, you can verify that you’ve instrumented your application with OpenTelemetry correctly by confirming that tracing data is being reported to SigNoz.

To do this, you need to ensure that your application generates some data. Applications will not produce traces unless they are being interacted with, and OpenTelemetry will often buffer data before sending. So you need to interact with your application and wait for some time to see your tracing data in SigNoz.

Validate your traces in SigNoz:

1. Trigger an action in your app that generates a web request. Hit the endpoint a number of times to generate some data. Then, wait for some time.
2. In SigNoz, open the `Services` tab. Hit the `Refresh` button on the top right corner, and your application should appear in the list of `Applications`.
3. Go to the `Traces` tab, and apply relevant filters to see your application’s traces.

You might see other dummy applications if you’re using SigNoz for the first time. You can remove it by following the docs [here](https://signoz.io/docs/operate/docker-standalone/#remove-the-sample-application).

<figure data-zoomable align='center'>
    <img src="/img/docs/opentelemetry_python_app_instrumented.webp" alt="Python Application in the list of services being monitored in SigNoz"/>
    <figcaption><i>Python Application in the list of services being monitored in SigNoz</i></figcaption></figure>
<br></br>
