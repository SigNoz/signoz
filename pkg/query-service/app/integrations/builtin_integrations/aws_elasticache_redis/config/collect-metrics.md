### Collect Redis Metrics

You can configure Redis metrics collection by providing the required config for CloudWatch Exporter and collector

#### Create collector config file

Save the following config for collecting ElastiCache metrics in a file named `elasticache-metrics-redis.yaml`

```yaml
---
region: us-east-1
metrics:
 - aws_namespace: AWS/ElastiCache
   aws_metric_name: CPUUtilization
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: FreeableMemory
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: NetworkBytesIn
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum, Average]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: NetworkBytesOut
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum, Average]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: NetworkPacketsIn
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum, Average]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: NetworkPacketsOut
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum, Average]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: SwapUsage
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: BytesUsedForCache
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: CacheHits
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: CacheMisses
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: CacheHitRate
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: CurrConnections
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: CurrItems
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: CurrVolatileItems
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: ReplicationLag
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: ReplicationLag
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: SaveInProgress
   aws_dimensions: [CacheClusterId, CacheNodeId]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: TrafficManagementActive
   aws_dimensions: [CacheClusterId, CacheNodeId]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: DatabaseCapacityUsagePercentage
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: DatabaseMemoryUsagePercentage
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: EngineCPUUtilization
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: Evictions
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum, Average]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: GlobalDatastoreReplicationLag
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: MemoryFragmentationRatio
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Average, Maximum]

 - aws_namespace: AWS/ElastiCache
   aws_metric_name: MemoryFragmentationRatio
   aws_dimensions: [CacheClusterId, CacheNodeId]
   aws_statistics: [Sum, Average]
```

Now, run the java -jar cloudwatch_exporter-0.15.5-jar-with-dependencies.jar 9106 redis.yaml

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
  otlp/elasticache:
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
      exporters: [otlp/elasticache]
```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config elasticache.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.
