&nbsp;

Once you are done intrumenting your JavaScript application, you can run it using the below commands

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
  nest start
```

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/nestjs/#troubleshooting-your-installation) for assistance.