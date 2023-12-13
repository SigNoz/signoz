### Restart the Otel Collector

Restart the otel collector so that new changes are saved and you should see the logs in the dashboard.

Kill the process if it was already running using the below command
```bash
kill "$(< otel-pid)"
```

Restart the OTel collector when you’re in the `otel-contirb` folder
```bash
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid
```

Now you should be able to see the Logs on your SigNoz Cloud UI
