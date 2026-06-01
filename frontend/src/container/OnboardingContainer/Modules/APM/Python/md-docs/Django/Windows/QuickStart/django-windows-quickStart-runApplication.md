Once you are done intrumenting your python application, you can run it using this command

```bash
setx OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} 
setx OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.{{REGION}}.signoz.cloud:443" 
setx OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" 
setx OTEL_EXPORTER_OTLP_PROTOCOL=grpc 

opentelemetry-instrument <your_run_command>
```
&nbsp;

`<your_run_command>` can be something like `python3 app.py` or `python manage.py runserver --noreload`

&nbsp;

**Note**
- Don’t run app in reloader/hot-reload mode as it breaks instrumentation. For example, you can disable the auto reload with --noreload.

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/django/#troubleshooting-your-installation) for assistance.
