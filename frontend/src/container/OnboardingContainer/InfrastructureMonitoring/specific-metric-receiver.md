## Enable a Specific Metric Receiver

SigNoz supports all the receivers that are listed in the [opentelemetry-collector-contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver) GitHub repository. To configure a new metric receiver, you must edit the `receivers` section of the `deploy/docker/clickhouse-setup/otel-collector-config.yaml` file. The following example shows the default configuration in which the `hostmetrics` receiver is enabled:

```yaml {14-22}
receivers:
 otlp/spanmetrics:
  protocols:
   grpc:
    endpoint: 'localhost:12345'
 otlp:
  protocols:
   grpc:
   http:
 jaeger:
  protocols:
   grpc:
   thrift_http:
 hostmetrics:
  collection_interval: 30s
  scrapers:
   cpu:
   load:
   memory:
   disk:
   filesystem:
   network:
processors:
 batch:
  send_batch_size: 1000
  timeout: 10s
# This file was truncated for brevity
```

To enable a new OpenTelemetry receiver, follow the steps below:

1. Move into the directory in which you installed SigNoz, and open the `deploy/docker/clickhouse-setup/otel-collector-config.yaml` file in a plain-text editor.
2. Configure your receivers. The following example shows how you can enable a receiver named `examplereceiver`:

```yaml {23,24}
receivers:
 otlp/spanmetrics:
  protocols:
   grpc:
    endpoint: 'localhost:12345'
 otlp:
  protocols:
   grpc:
   http:
 jaeger:
  protocols:
   grpc:
   thrift_http:
 hostmetrics:
  collection_interval: 30s
  scrapers:
   cpu:
   load:
   memory:
   disk:
   filesystem:
   network:
 examplereceiver:
  endpoint: 1.2.3.4:8080
processors:
 batch:
  send_batch_size: 1000
  timeout: 10s
# This file was truncated for brevity.
```

For details about configuring OpenTelemetry receivers, see the [README](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/README.md) page of the `opentelemetry-collector` GitHub repository. 3. <SaveChangesRestart />
