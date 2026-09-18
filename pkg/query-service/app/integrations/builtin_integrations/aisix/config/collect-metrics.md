# Collect Metrics from AISIX AI Gateway

To scrape Prometheus metrics exposed by the AISIX AI Gateway `/metrics` endpoint, add a `prometheus` receiver block in your OpenTelemetry Collector configuration file (`otel-collector-config.yaml`):

```yaml
receivers:
  prometheus/aisix:
    config:
      scrape_configs:
        - job_name: 'aisix-ai-gateway'
          scrape_interval: 15s
          static_configs:
            - targets: ['<AISIX_GATEWAY_HOST>:9090']

service:
  pipelines:
    metrics/aisix:
      receivers: [prometheus/aisix]
      processors: [batch]
      exporters: [signoz]
```

Replace `<AISIX_GATEWAY_HOST>:9090` with the actual hostname/IP and port of your AISIX AI Gateway metrics listener.
