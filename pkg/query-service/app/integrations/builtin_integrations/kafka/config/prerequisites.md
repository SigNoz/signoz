## Before You Begin

To monitor Kafka with SigNoz, make sure the following requirements are already covered.

- **A reachable Kafka cluster**
  The OpenTelemetry Collector must be able to connect to at least one broker in the cluster.

- **Broker metadata access**
  The configured Kafka credentials must allow the collector to read broker, topic, partition, and consumer-group metadata.

- **An OTEL Collector in your environment**
  If needed, install an OpenTelemetry Collector first. The collector should be able to forward metrics to SigNoz.

- **Optional cluster alias**
  If you operate more than one Kafka cluster, set `cluster_alias` in the receiver config so the dashboard can filter clusters cleanly.
