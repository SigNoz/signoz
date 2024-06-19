### Collect ElastiCache Metrics

The ElastiCache (redis) metrics collection is a two-step process.

#### Set up the Prometheus CloudWatch exporter

The [CloudWatch Exporter](https://github.com/prometheus/cloudwatch_exporter) is A Prometheus exporter for collecting CloudWatch metrics. This section describes the steps for downloading and configuring the Prometheus CloudWatch exporter.

1. Download the Prometheus CloudWatch exporter JAR file, and run the following command:

```sh
curl -sLSO https://github.com/prometheus/cloudwatch_exporter/releases/download/v0.15.5/cloudwatch_exporter-0.15.5-jar-with-dependencies.jar
```

2. Configure the Prometheus exporter

Save the following config for collecting AWS ElastiCache metrics in a file named `aws-elasticache-metrics.yaml` and set the `region` with the relevant value.

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

3. Run the following command

```sh
java -jar cloudwatch_exporter-0.15.5-jar-with-dependencies.jar 9106 aws-elasticache-metrics.yaml
```

#### Set up the OTEL Collector

Save the following config for collecting Redis native metrics in a file named `redis-metrics-collection-config.yaml`

```yaml
receivers:
  redis:
    # The hostname and port of the Redis instance, separated by a colon.
    endpoint: ${env:REDIS_ENDPOINT}
    # The frequency at which to collect metrics from the Redis instance.
    collection_interval: 60s
    # The password used to access the Redis instance; must match the password specified in the requirepass server configuration option.
    password: ${env:REDIS_PASSWORD}
    # # Defines the network to use for connecting to the server. Valid Values are `tcp` or `Unix`
    # transport: tcp
    # tls:
    #   insecure: false
    #   ca_file: /etc/ssl/certs/ca-certificates.crt
    #   cert_file: /etc/ssl/certs/redis.crt
    #   key_file: /etc/ssl/certs/redis.key
    metrics:
      redis.maxmemory:
        enabled: true
      redis.cmd.latency:
        enabled: true

  prometheus:
    config:
      scrape_configs:
        - job_name: 'aws-cloudwatch-metrics'
          scrape_timeout: 120s
          scrape_interval: 120s
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
    metrics/redis:
      receivers: [redis, prometheus]
      processors: []
      exporters: [otlp/signoz]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# The accessible endpoint where redis server is running.
# The hostname and port of the Redis instance, separated by a colon.
export REDIS_ENDPOINT="<redis-server-endpoint>"

# The password to use for accessing redis instance
export REDIS_PASSWORD="<PASSWORD>"

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config redis-metrics-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.
