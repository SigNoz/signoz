Once you are done intrumenting your Java application, you can run it using the below commands

### Step 1: Run OTel Collector
 Run this command inside the `otelcol-contrib` directory that you created in the install Otel Collector step

```bash
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid
```
### (Optional Step): View last 50 lines of `otelcol` logs
```bash
tail -f -n 50 otelcol-output.log
```

### (Optional Step): Stop `otelcol`
```bash
kill "$(< otel-pid)"
```

### Step 2: Enable the instrumentation agent and run your application

If you run your .war package by putting in webapps folder, just add setenv.sh in your Tomcat bin folder.

This should set the environment variable and start sending telemetry data to SigNoz Cloud.

```bash
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/<path>/opentelemetry-javaagent.jar"
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step
