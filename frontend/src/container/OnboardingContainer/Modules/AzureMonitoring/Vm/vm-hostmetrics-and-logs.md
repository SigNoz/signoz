## Prerequisites

- An Azure subscription with Azure VM and SSH access enabled
- Central Collector Setup


### Connect to the VM
The [SSH Keys Guide](https://learn.microsoft.com/en-us/azure/virtual-machines/ssh-keys-portal#connect-to-the-vm) has steps on how to connect to your VM via SSH.

&nbsp;

### Install OpenTelemetry Collector

Follow the [OpenTelemetry SigNoz documentation](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) to install the OpenTelemetry Collector. 

&nbsp;

### Configure Collector

 We send the logs, traces and metrics to the central collector that we set up in the previous step instead of SigNoz directly, in order to adopt a scalable architecture pattern. We recommend to our users to use the same pattern in your Azure subscription.

Replace the content of the `config.yaml` file that you created while installing the collector.

```yaml
receivers:
  filelog:
    include: [ <file paths> ] # /var/log/myservice/*.json 
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%d %H:%M:%S'
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  hostmetrics:
    collection_interval: 60s
    scrapers:
      cpu: {}
      disk: {}
      load: {}
      filesystem: {}
      memory: {}
      network: {}
      paging: {}
      process:
        mute_process_name_error: true
        mute_process_exe_error: true
        mute_process_io_error: true
      processes: {}
  prometheus:
    config:
      global:
        scrape_interval: 60s
      scrape_configs:
        - job_name: otel-collector-binary
          static_configs:
            - targets:
              # - localhost:8888
processors:
  batch:
    send_batch_size: 1000
    timeout: 10s
  # Ref: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
  resourcedetection:
    detectors: [env, azure, system] 
    # Using OTEL_RESOURCE_ATTRIBUTES envvar, env detector adds custom labels.
    timeout: 2s
    system:
      hostname_sources: [dns, os] 
extensions:
  health_check: {}
  zpages: {}
exporters:
  otlp:
    endpoint: "<Central Collector DNS Name>:4318"
  logging:
    verbosity: normal
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
  extensions: [health_check, zpages]
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics/internal:
      receivers: [prometheus, hostmetrics]
      processors: [resourcedetection, batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [otlp, filelog]
      processors: [batch]
      exporters: [otlp]
```
&nbsp;

#### OLTP Exporter Configuration
Make sure to replace `<Central Collector DNS Name>` with the DNS name of your central collector that you set up earlier.

&nbsp;

#### File Logs Receiver Configuration
The file logs receiver needs to be configured with the paths to the log files that you want to stream to SigNoz. You can specify multiple paths by separating them as a array.

You can also specify globed path patterns to match multiple log files. For example, `/var/log/myservice/*.json` will match all log files in the `/var/log/myservice` directory with a `.json` extension.

&nbsp;

### Start the OpenTelemetry Collector

Once we are done with the above configurations, we can now run the collector service with the following command:

```bash
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid
```

&nbsp;

### Hostmetrics Dashboard

Once the collector is running, you can access the SigNoz dashboard to view the logs and metrics from your Azure VM.

Please refer to the [Hostmetrics Dashboard](https://signoz.io/docs/userguide/hostmetrics/) for information on how to import and use the dashboard.

