# Enable a specific metrics Receiver

SigNoz supports all the receivers that are listed in the [opentelemetry-collector-contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver) GitHub repository. To configure a new metric receiver, you must edit the **`receivers`** and **`service::pipelines`** sections of the **`config.yaml`** file that you created in the previous step.

To enable a new OpenTelemetry receiver, follow the steps below:
#### 1. Open the `config.yaml` file in a plain-text editor.
#### 2. Configure your receivers. The following example shows how you can enable a `rabbitmq` receiver:
```bash
receivers:
 otlp:
  protocols:
   grpc:
    endpoint: localhost:4317
   http:
    endpoint: localhost:4318
 hostmetrics:
  collection_interval: 30s
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
   processes: {}
 rabbitmq:
  endpoint: http://localhost:15672
  username: <RABBITMQ_USERNAME>
  password: <RABBITMQ_PASSWORD>
  collection_interval: 10s
processors:
 batch:
  send_batch_size: 1000
  timeout: 10s
 # Ref: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
 resourcedetection:
  detectors: [env, system, ec2] # include ec2 for AWS, gce for GCP and azure for Azure.
  # Using OTEL_RESOURCE_ATTRIBUTES envvar, env detector adds custom labels.
  timeout: 2s
  override: false
  system:
   hostname_sources: [os] # alternatively, use [dns,os] for setting FQDN as host.name and os as fallback
exporters:
 otlp:
  endpoint: 'ingest.{{REGION}}.signoz.cloud:443' # replace {region} with your region
  tls:
   insecure: false
  headers:
   'signoz-ingestion-key': '{{SIGNOZ_INGESTION_KEY}}'
 logging:
  loglevel: debug
service:
 telemetry:
  metrics:
   address: localhost:8888
 pipelines:
  metrics:
   receivers: [otlp, rabbitmq]
   processors: [batch]
   exporters: [otlp]
  metrics/hostmetrics:
   receivers: [hostmetrics]
   processors: [resourcedetection, batch]
   exporters: [otlp]
```
For details about configuring OpenTelemetry receivers, see the [README](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/README.md) page of the opentelemetry-collector GitHub repository.

# Enable Prometheus Receiver

SigNoz supports all the exporters that are listed on the [Exporters and Integrations](https://prometheus.io/docs/instrumenting/exporters/) page of the Prometheus documentation. If you have a running Prometheus instance, and you expose metrics in Prometheus, then you can scrape them in SigNoz by configuring Prometheus receivers in the **`receivers::prometheus::config::scrape_configs`** section of the **`config.yaml`** file you created in the previous step.

To enable a Prometheus receiver, follow the steps below:

#### 1. Open the `config.yaml` file in a plain-text editor.
#### 2. Enable a new Prometheus receiver. Depending on your use case, there are two ways in which you can enable a new Prometheus exporter:
- **By creating a new job**: The following example shows how you can enable a Prometheus receiver by creating a new job named **`my-new-job`**.
```bash

...
  # Data sources: metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: "otel-collector"
          scrape_interval: 30s
          static_configs:
            - targets: ["otel-collector:8889"]
        - job_name: "my-new-job"
          scrape_interval: 30s
          static_configs:
            - targets: ["localhost:8080"]
  ...
# This file was truncated for brevity.
```
**Note:**
- All the jobs are scraped in parallel, and all targets inside a job are scraped serially. For more details about configuring jobs and targets, see the  
[<Scrape_config>](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config) and [Jobs and Instances](https://prometheus.io/docs/concepts/jobs_instances/) sections of the Prometheus documentation.

