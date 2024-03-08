### Step 1: Add filelog receiver to `config.yaml` file of otel collector

Add the filelog receiver in the receivers section of `config.yaml` file of the **`otecol-contrib`** directory that you created in the previous step

```bash
receivers:
  ...
  filelog/app:
    include: [ /tmp/app.log ]
    start_at: end
...
```
Replace `/tmp/app.log` with the path to your log file.

Note: change the `start_at` value to `beginning` if you want to read the log file from the beginning. It may be useful if you want to send old logs to SigNoz. The log records older than the standard log retention period (default 15 days) will be discarded.

For more configurations that are available for filelog receiver please check [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver).

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