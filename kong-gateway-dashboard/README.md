# Kong Gateway Monitoring Dashboard

Comprehensive Kong API Gateway monitoring dashboard for [SigNoz](https://signoz.io/), using Kong's native [OpenTelemetry plugin](https://docs.konghq.com/plugins/opentelemetry/) (Kong 3.13+).

## Prerequisites

- Kong Gateway **3.13+** with the OpenTelemetry plugin enabled
- OpenTelemetry Collector forwarding metrics to SigNoz
- SigNoz Cloud or self-hosted instance

## Sections

| #   | Section         | Panels                                                                                     |
| --- | --------------- | ------------------------------------------------------------------------------------------ |
| 1   | General Overview | Total Requests, Request Rate, Active Connections, DB Connected, CP Connected, Total Errors, Waiting Connections, Handled Connections |
| 2   | Request Metrics | Request Rate by Service, Requests by HTTP Status Code, Request Size (p50/p90/p99), Response Size (p50/p90/p99) |
| 3   | Latency Metrics | Request Latency (p50/p90/p99), Upstream Latency (p50/p90/p99), Kong Internal Latency (p50/p90/p99) |
| 4   | Error Metrics   | 5xx Error Rate by Service, 4xx Errors by Status Code, Error Rate (4xx+5xx), 5xx Errors by Route |
| 5   | Traffic Metrics | Bandwidth by Service (ingress/egress), Nginx Connection States, Accepted vs Handled Connections |
| 6   | Upstream Health | Upstream Target Health (healthy/unhealthy/dns_error)                                       |
| 7   | Resource Usage  | Lua Shared Dict Memory (used vs total), Worker Lua VM Memory, Nginx Timers (pending/running) |

## Metrics Used

All metrics come from Kong's native OpenTelemetry plugin. No Prometheus plugin required.

| Metric                          | Type      | Description                                      |
| ------------------------------- | --------- | ------------------------------------------------ |
| `http.server.request.count`     | Sum       | Total incoming HTTP requests                     |
| `kong.latency.total`            | Histogram | End-to-end request latency (seconds)             |
| `kong.latency.internal`         | Histogram | Kong internal processing time (seconds)          |
| `kong.latency.upstream`         | Histogram | Upstream service latency (seconds)               |
| `http.server.request.size`      | Histogram | Incoming request body size (bytes)               |
| `http.server.response.size`     | Histogram | Response body size (bytes)                       |
| `kong.nginx.connection.count`   | Gauge     | Nginx connection states                          |
| `kong.nginx.timer.count`        | Gauge     | Nginx internal timers                            |
| `kong.upstream.target.status`   | Gauge     | Upstream target health                           |
| `kong.shared_dict.usage`        | Gauge     | Shared dict memory used (bytes)                  |
| `kong.shared_dict.size`         | Gauge     | Shared dict total capacity (bytes)               |
| `kong.memory.workers.lua_vm`    | Gauge     | Worker Lua VM memory (bytes)                     |
| `kong.db.connection.status`     | Gauge     | Database connectivity (1=connected)              |
| `kong.cp.connection.status`     | Gauge     | Control plane connectivity (1=connected)         |

## OTel Collector Config

### 1. Enable the OpenTelemetry plugin on Kong

```bash
curl -i -X POST http://localhost:8001/plugins \
  --data "name=opentelemetry" \
  --data "config.metrics_endpoint=http://otel-collector:4318/v1/metrics" \
  --data "config.traces_endpoint=http://otel-collector:4318/v1/traces" \
  --data "config.resource_attributes.deployment.environment=production"
```

### 2. Deploy the OpenTelemetry Collector

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: "ingest.<region>.signoz.cloud:443"
    tls:
      insecure: false
    headers:
      signoz-ingestion-key: "<your-ingestion-key>"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

Replace:
- `<region>`  your SigNoz Cloud [region](https://signoz.io/docs/ingestion/signoz-cloud/overview/#endpoint)
- `<your-ingestion-key>`  your [ingestion key](https://signoz.io/docs/ingestion/signoz-cloud/keys/)

## Dashboard Variables

| Variable                 | Attribute                | Description                                |
| ------------------------ | ------------------------ | ------------------------------------------ |
| `$deployment_environment`| `deployment.environment` | Filter by environment (production, staging)|
| `$kong_service`          | `kong.service.name`      | Filter by Kong service                     |
| `$kong_route`            | `kong.route.name`        | Filter by Kong route                       |

## References

- [Kong OpenTelemetry Plugin](https://docs.konghq.com/plugins/opentelemetry/)
- [Kong OTel Metrics Reference](https://developer.konghq.com/gateway/otel-metrics/)
- [SigNoz Dashboard Templates](https://signoz.io/docs/dashboards/dashboard-templates/overview/)
