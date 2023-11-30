&nbsp;

Once you are done intrumenting your Ruby on Rails application, you can run it using the below commands

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

### Step 2: Running your Ruby application

Run the application using the below:

```bash
OTEL_EXPORTER=otlp \
OTEL_SERVICE_NAME={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
rails server
```
&nbsp;

**Note:**
- In case you have OtelCollector Agent in different VM, replace localhost:4318 with <IP Address of the VM>:4318.