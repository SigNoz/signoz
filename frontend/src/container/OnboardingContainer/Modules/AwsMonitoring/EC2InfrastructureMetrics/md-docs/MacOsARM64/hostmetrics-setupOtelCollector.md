### Prerequisite 
- A running EC2 instance

&nbsp;

### Setup OpenTelemetry Binary as an agent

### Step 1: Download otel-collector tar.gz
```bash
wget https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v{{OTEL_VERSION}}/otelcol-contrib_{{OTEL_VERSION}}_darwin_arm64.tar.gz
```
### Step 2: Extract otel-collector tar.gz to the `otelcol-contrib` folder
```bash
mkdir otelcol-contrib && tar xvzf otelcol-contrib_{{OTEL_VERSION}}_darwin_arm64.tar.gz -C otelcol-contrib
```

### Step 3: Create config.yaml in folder otelcol-contrib with the below content in it
```bash
receivers:
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
    detectors: [env, system] # Before system detector, include ec2 for AWS, gcp for GCP and azure for Azure.
    # Using OTEL_RESOURCE_ATTRIBUTES envvar, env detector adds custom labels.
    timeout: 2s
    system:
      hostname_sources: [os] # alternatively, use [dns,os] for setting FQDN as host.name and os as fallback
extensions:
  health_check: {}
  zpages: {}
exporters:
  otlp:
    endpoint: "ingest.{{REGION}}.signoz.cloud:443"
    tls:
      insecure: false
    headers:
      "signoz-ingestion-key": "{{SIGNOZ_INGESTION_KEY}}"
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
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```
### Step 4: Run OTel Collector
 Run this command inside the `otelcol-contrib` directory

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

