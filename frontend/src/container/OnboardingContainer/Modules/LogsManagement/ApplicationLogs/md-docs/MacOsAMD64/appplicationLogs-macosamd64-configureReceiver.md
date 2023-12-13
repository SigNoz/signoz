### Step 1: Add filelog receiver to `config.yaml` file of otel collector

Add the filelog receiver in the receivers section of `config.yaml` file of the **`otecol-contrib`** directory that you created in the previous step

```bash
receivers:
  ...
  filelog/app:
    include: [ /tmp/app.log ]
    start_at: beginning
...
```
Replace `/tmp/app.log` with the path to your log file.

For more configurations that are available for syslog receiver please check [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver).

### Step 2: Include filelog receiver in the Pipeline
We will modify our pipeline inside `config.yaml` to include the receiver we have created above.
```bash
service:
    ....
    logs:
        receivers: [otlp, filelog/app]
        processors: [batch]
        exporters: [otlp]
```