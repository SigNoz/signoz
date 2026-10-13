### Collect cert-manager Metrics

You can collect cert-manager metrics by scraping the controller metrics endpoint with the OpenTelemetry Collector.

#### Create collector config file

Save the following config in `cert-manager-metrics-collection-config.yaml`:

```yaml
receivers:
  prometheus/cert_manager:
    config:
      scrape_configs:
        - job_name: cert-manager
          scrape_interval: 60s
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            - source_labels: [__meta_kubernetes_namespace]
              action: keep
              regex: cert-manager
            - source_labels:
                [__meta_kubernetes_pod_label_app_kubernetes_io_name]
              action: keep
              regex: cert-manager
            - source_labels: [__meta_kubernetes_pod_container_port_name]
              action: keep
              regex: http-metrics

processors:
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.pod.name
        - k8s.node.name

exporters:
  otlp:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      signoz-access-token: "${env:SIGNOZ_INGESTION_KEY}"

service:
  pipelines:
    metrics:
      receivers: [prometheus/cert_manager]
      processors: [k8sattributes]
      exporters: [otlp]
```

#### Set Environment Variables

```bash
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"
```

#### Use collector config file

Make the config file available to the collector and start it with:

```bash
otelcol-contrib --config cert-manager-metrics-collection-config.yaml
```

If you already run a collector, add the file as another `--config` input and merge the pipeline into your existing deployment.
