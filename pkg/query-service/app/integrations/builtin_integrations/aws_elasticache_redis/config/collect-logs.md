### Collect ElastiCache Logs

Use the [log delivery](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Log_Delivery.html) instructions to send redis logs to CloudWatch Logs

#### Find the list of log group names for ElastiCache instance

Collecting logs from an ElastiCache instance requires specifying the list of log group names. From the AWS CloudWatch console, find the log group(s) relevant to the integration.

#### Create collector config file

Save the following configuration for collecting ElastiCache logs in a file named `redis-logs-collection-config.yaml` and set the `region` key with the relevant value.

```yaml
receivers:
  awscloudwatch:
    region: us-east-1
    logs:
      poll_interval: 1m
      groups:
        named:
          # replace the following name with your log group for elasticache logs
          /aws/elasticache/:

processors:
  attributes/add_source:
    actions:
      - key: source
        value: "elasticache_redis"
        action: insert
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s

exporters:
  # export to SigNoz cloud
  otlp/redis-logs:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  otlp/local:
    endpoint: "localhost:4317"
    tls:
      insecure: true

service:
  pipelines:
    logs/redis:
      receivers: [awscloudwatch]
      processors: [attributes/add_source, batch]
      exporters: [otlp/redis-logs]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config redis-logs-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

