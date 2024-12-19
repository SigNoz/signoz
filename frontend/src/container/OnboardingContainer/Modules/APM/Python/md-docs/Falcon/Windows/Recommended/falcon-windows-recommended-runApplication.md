&nbsp;

Once you are done intrumenting your python application, you can run it using these commands

### Step 1: Run OTel Collector
 Run this command inside the `otelcol-contrib` directory that you created in the install Otel Collector step

```bash
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid
```
&nbsp;

#### (Optional Step): View last 50 lines of `otelcol` logs
```bash
tail -f -n 50 otelcol-output.log
```

#### (Optional Step): Stop `otelcol`
```bash
kill "$(< otel-pid)"
```
&nbsp;

### Step 2: Run your application
```bash
setx OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} 
setx OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.{{REGION}}.signoz.cloud:443" 
setx OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}" 
setx OTEL_EXPORTER_OTLP_PROTOCOL=grpc 

opentelemetry-instrument <your_run_command>
```
&nbsp;

`<your_run_command>` can be something like `python3 app.py` or `flask run`
&nbsp;

**Note**
- Use port **`4317`** for gRPC exporter and port **`4318`** for HTTP exporter
- If your OpenTelemetry Collector agent is in different VM, replace `http://localhost:4317` in above run command with `<IP Address of the VM>:4317`
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/falcon/#troubleshooting-your-installation) for assistance.