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

### Step 2: Open `standalone.conf` Configuration File
```bash
vim /opt/jboss-eap-7.1/bin/standalone.conf
```

### Step 3: Update `JAVA_OPTS` environment variable
```bash
JAVA_OPTS="-javaagent:/<path>/opentelemetry-javaagent.jar"
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step

