### Collect RDS Metrics

Collecting RDS (for PostgreSQL) metrics is a two-step process.

#### Set up the Prometheus CloudWatch exporter

The [CloudWatch Exporter](https://github.com/prometheus/cloudwatch_exporter) is A Prometheus exporter for collecting CloudWatch metrics. This section describes the steps for downloading and configuring the Prometheus CloudWatch exporter.

1. Download the Prometheus CloudWatch exporter JAR file, and run the following command:

```sh
curl -sLSO https://github.com/prometheus/cloudwatch_exporter/releases/download/v0.15.5/cloudwatch_exporter-0.15.5-jar-with-dependencies.jar
```

2. Configure the Prometheus exporter

Save the following config for collecting AWS RDS metrics in a file named `aws-rds-postgres-metrics.yaml` and update the `region` key with relevant value.

```yaml
---
region: us-east-1
metrics:
 - aws_namespace: AWS/RDS
   aws_metric_name: BinLogDiskUsage
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: BurstBalance
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: CheckpointLag
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ConnectionAttempts
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: CPUUtilization
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: DatabaseConnections
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: DiskQueueDepth
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: DiskQueueDepthLogVolume
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: EBSByteBalance%
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: EBSIOBalance%
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: FreeableMemory
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: FreeLocalStorage
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: FreeStorageSpace
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: FreeStorageSpaceLogVolume
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: MaximumUsedTransactionIDs
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: NetworkReceiveThroughput
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: NetworkTransmitThroughput
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: OldestReplicationSlotLag
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadIOPS
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadIOPSLocalStorage
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadIOPSLogVolume
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadLatency
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadLatencyLocalStorage
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadLatencyLogVolume
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadThroughput
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadThroughputLogVolume
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReplicaLag
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReplicationChannelLag
   aws_dimensions: [DBInstanceIdentifier]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReplicationSlotDiskUsage
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: TransactionLogsDiskUsage
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: TransactionLogsGeneration
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: WriteIOPS
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: WriteLatency
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: WriteThroughput
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: SwapUsage
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: DBLoad
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: DBLoadCPU
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: DBLoadNonCPU
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]
```

3. Run the following command

```sh
java -jar cloudwatch_exporter-0.15.5-jar-with-dependencies.jar 9106 aws-rds-postgres-metrics.yaml
```

4. Verify the CloudWatch metrics

Visit the http://localhost:9106/metrics and confirm the `aws_rds_*` metrics are avialable.

#### Set up the OTEL Collector

Save the following config for collecting Postgres metrics in a file named `postgres-metrics-collection-config.yaml`

```yaml
receivers:
  postgresql:
    # The endpoint of the postgresql server. Whether using TCP or Unix sockets, this value should be host:port. If transport is set to unix, the endpoint will internally be translated from host:port to /host.s.PGSQL.port
    endpoint: ${env:POSTGRESQL_ENDPOINT}
    # The frequency at which to collect metrics from the Postgres instance.
    collection_interval: 60s
    # The username used to access the postgres instance
    username: ${env:POSTGRESQL_USERNAME}
    # The password used to access the postgres instance
    password: ${env:POSTGRESQL_PASSWORD}
    # The list of databases for which the receiver will attempt to collect statistics. If an empty list is provided, the receiver will attempt to collect statistics for all non-template databases
    databases: ["pgtestdb"]
    # # Defines the network to use for connecting to the server. Valid Values are `tcp` or `unix`
    # transport: tcp
    tls:
      insecure_skip_verify: true
    #   ca_file: /etc/ssl/certs/ca-certificates.crt
    #   cert_file: /etc/ssl/certs/postgres.crt
    #   key_file: /etc/ssl/certs/postgres.key
    metrics:
      postgresql.database.locks:
        enabled: true
      postgresql.deadlocks:
        enabled: true
      postgresql.sequential_scans:
        enabled: true

  prometheus:
    config:
      scrape_configs:
        - job_name: 'aws-cloudwatch-metrics'
          scrape_timeout: 120s
          scrape_interval: 300s
          static_configs:
            - targets: ['0.0.0.0:9106']

exporters:
  # export to local collector
  otlp/local:
    endpoint: "localhost:4317"
    tls:
      insecure: true
  # export to SigNoz cloud
  otlp/signoz:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

service:
  pipelines:
    metrics/postgresql:
      receivers: [postgresql, prometheus]
      processors: []
      exporters: [otlp/signoz]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# The accessible endpoint where PostgreSQL server is running
export POSTGRESQL_ENDPOINT="<postgres-server-endpoint>"

export POSTGRESQL_USERNAME="<username>"

# The password to use for accessing postgres instance
export POSTGRESQL_PASSWORD="<PASSWORD>"

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your OpenTelemetry (OTel) collector and use it by adding the following flag to the command for running your collector:
```bash
--config postgres-metrics-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.
