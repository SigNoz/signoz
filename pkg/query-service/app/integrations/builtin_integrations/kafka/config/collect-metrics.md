### Collect Kafka Metrics

You can collect Kafka broker, topic, partition, and consumer group metrics with the OpenTelemetry `kafkametricsreceiver`.

#### Create collector config file

Save the following configuration as `kafka-metrics-collection-config.yaml`:

```yaml
receivers:
  kafkametrics:
    brokers:
      - ${env:KAFKA_BROKERS}
    cluster_alias: ${env:KAFKA_CLUSTER_ALIAS}
    collection_interval: 60s
    protocol_version: 3.0.0
    scrapers:
      - brokers
      - topics
      - consumers

processors:
  batch:

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
      receivers: [kafkametrics]
      processors: [batch]
      exporters: [otlp]
```

If your brokers require authentication, add the relevant `tls`, `sasl`, or `kerberos` settings supported by the receiver.

#### Set Environment Variables

```bash
export KAFKA_BROKERS="broker-1:9092"
export KAFKA_CLUSTER_ALIAS="kafka-prod"
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"
```

#### Use collector config file

Start the collector with:

```bash
otelcol-contrib --config kafka-metrics-collection-config.yaml
```

If you already run a collector, merge this receiver and pipeline into the existing configuration instead of launching a separate process.
