&nbsp;

Once you are done instrumenting your Angular application, you can run it using the below commands
&nbsp;

### Step 1: Run OTel Collector
 Run this command inside the `otelcol-contrib` directory that you created in the install Otel Collector step

&nbsp;

```bash
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid
```
&nbsp;

### Step 2: Run your application

```bash
ng serve
```

&nbsp;
