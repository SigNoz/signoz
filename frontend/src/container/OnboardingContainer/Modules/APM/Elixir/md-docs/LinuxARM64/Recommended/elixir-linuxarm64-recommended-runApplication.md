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

### Step 2: Running your Elixir application
Once you are done instrumenting your Elixir (Phoenix + Ecto) application with OpenTelemetry, you should install the dependencies needed to run your application and run it as you normally would.

&nbsp;

To see some examples for instrumented applications, you can checkout [this link](https://signoz.io/docs/instrumentation/elixir/#sample-examples)
```