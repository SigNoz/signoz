### Restart the Otel Collector

Restart the otel collector so that new changes are saved and you should see the logs in the dashboard.
 &nbsp;

**Stop OTel Collector if it was already running using the below command in `otelcol-contrib` directory**
```bash
kill "$(< otel-pid)"
```

**Restart the OTel collector by running the below command in `otelcol-contrib` directory**
```bash
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid
```
&nbsp;

### Restart logstash 
 &nbsp;

Now you should be able to see the Logs on your SigNoz Cloud UI
