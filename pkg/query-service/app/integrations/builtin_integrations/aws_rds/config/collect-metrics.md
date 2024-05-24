### Collect mysql Metrics

You can configure mysql metrics collection by providing the required config for CloudWatch Exporter and collector

#### Create collector config file

Save the following config for collecting RDS metrics in a file named `rds-metrics-mysql.yaml`

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
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: DiskQueueDepth
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
   aws_statistics: [Average]

 - aws_namespace: AWS/RDS
   aws_metric_name: FreeStorageSpace
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
   aws_metric_name: ReadIOPS
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadLatency
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/RDS
   aws_metric_name: ReadThroughput
   aws_dimensions: [DBInstanceIdentifier]
   aws_statistics: [Average, Maximum]

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
   aws_metric_name: ReplicationChannelLag
   aws_dimensions: [DBInstanceIdentifier]

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

Now, run the java -jar cloudwatch_exporter-0.15.5-jar-with-dependencies.jar 9106 mysql.yaml

#### Configure the host machine with AWS access and secret key

Please follow the official AWS guide here https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html

#### Configure the collector

```yaml
receivers:
  prometheus:
    config:
      global:
        scrape_interval: 120s
      scrape_configs:
        - job_name: aws-cloudwatch-metrics
          scrape_timeout: 120s
          static_configs:
          - targets:
              - localhost:9106


processors:
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  zpages:
    endpoint: 0.0.0.0:55679
  pprof:
    endpoint: 0.0.0.0:1777

exporters:
  # export to SigNoz cloud
  otlp/rds:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"


service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
  extensions:
    - health_check
    - zpages
    - pprof
  pipelines:
    metrics/prometheus:
      receivers: [prometheus]
      processors: [batch]
      exporters: [otlp/rds]
```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config rds.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.
