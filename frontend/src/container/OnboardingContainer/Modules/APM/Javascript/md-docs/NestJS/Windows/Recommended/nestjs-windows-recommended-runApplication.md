&nbsp;

Once you are done intrumenting your JavaScript application, you can run it using the below commands

### Step 1: Run OTel Collector
 Run this command inside the `otelcol-contrib` directory that you created in the install Otel Collector step

```bash
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid
```
&nbsp;

### Step 2: Run the application
```bash
  nest start
```