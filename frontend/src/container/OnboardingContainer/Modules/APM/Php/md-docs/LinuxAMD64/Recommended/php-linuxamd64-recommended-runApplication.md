&nbsp;

Once you are done instrumenting your PHP application, you can run it using the below commands

&nbsp;

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

### Step 2: Running your PHP application

We will pass environment variables at the runtime: 

```bash
env OTEL_PHP_AUTOLOAD_ENABLED=true \
    OTEL_SERVICE_NAME=<SERVICE_NAME> \
    OTEL_TRACES_EXPORTER=otlp \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_EXPORTER_OTLP_ENDPOINT=<COLLECTOR_ENDPOINT> \
    OTEL_PROPAGATORS=baggage,tracecontext \
    <your-run-command>
```

- <COLLECTOR_ENDPOINT> - Endpoint at which the collector is running. Ex. -> `http://localhost:4317`
- <your-run-command> - Run command for your PHP application