### Collect RDS Metrics

The RDS (for MySQL) metrics collection is a two-step process.

#### Set up the Prometheus CloudWatch exporter

The [CloudWatch Exporter](https://github.com/prometheus/cloudwatch_exporter) is A Prometheus exporter for collecting CloudWatch metrics. This section describes the steps for downloading and configuring the Prometheus CloudWatch exporter.

1. Download the Prometheus CloudWatch exporter JAR file, and run the following command:

```sh
curl -sLSO https://github.com/prometheus/cloudwatch_exporter/releases/download/v0.15.5/cloudwatch_exporter-0.15.5-jar-with-dependencies.jar
```

2. Configure the Prometheus exporter

Save the following config for collecting AWS RDS metrics in a file named `aws-rds-mysql-metrics.yaml`. Update the `region` with relevant value.

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
java -jar cloudwatch_exporter-0.15.5-jar-with-dependencies.jar 9106 aws-rds-mysql-metrics.yaml
```

#### Set up the OTEL Collector

Save the following config for collecting MySQL metrics in a file named `mysql-metrics-collection-config.yaml`

```yaml
receivers:
  mysql:
    # The hostname and port of the MySQL instance, separated by a colon.
    endpoint: ${env:MYSQL_ENDPOINT}
    # The username used to access the MySQL instance.
    username: ${env:MYSQL_USERNAME}
    # The password used to access the MySQL instance.
    password: ${env:MYSQL_PASSWORD}
    # The frequency at which to collect metrics from the Redis instance.
    collection_interval: 60s
    # Additional configuration for query to build mysql.statement_events.count and mysql.statement_events.wait.time metrics
    statement_events:
      digest_text_limit: 120
      time_limit: 24h
      limit: 250
    # tls:
    #   insecure: false
    #   ca_file: /etc/ssl/certs/ca-certificates.crt
    #   cert_file: /etc/ssl/certs/redis.crt
    #   key_file: /etc/ssl/certs/redis.key
    metrics:
      mysql.client.network.io:
        enabled: true
      mysql.commands:
        enabled: true
      mysql.connection.count:
        enabled: true
      mysql.connection.errors:
        enabled: true
      mysql.joins:
        enabled: true
      mysql.query.count:
        enabled: true
      mysql.query.slow.count:
        enabled: true
      mysql.replica.sql_delay:
        enabled: true
      mysql.replica.time_behind_source:
        enabled: true

  # Collecting cloudwatch metrics
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
    metrics/mysql:
      receivers: [mysql, prometheus]
      processors: []
      exporters: [otlp/signoz]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# The accessible endpoint where MySQL server is running
export MYSQL_ENDPOINT="<mysql-server-endpoint>"

export MYSQL_USERNAME="<username>"

# The password to use for accessing mysql instance
export MYSQL_PASSWORD="<PASSWORD>"

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config mysql-metrics-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.
