&nbsp;

Once you are done intrumenting your python application, you can run it using this command

```bash
OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317" \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc opentelemetry-instrument <your_run_command>
```

`<your_run_command>` can be something like `python3 app.py` or `python manage.py runserver --noreload`

&nbsp;

**Note**
- Use port **`4317`** for gRPC exporter and port **`4318`** for HTTP exporter
- If your OpenTelemetry Collector agent is in different VM, replace `http://localhost:4317` in above run command with `<IP Address of the VM>:4317`
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/falcon/#troubleshooting-your-installation) for assistance.