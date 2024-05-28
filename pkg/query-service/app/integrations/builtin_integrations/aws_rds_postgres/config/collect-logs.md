### Collect RDS Logs

#### Create collector config file

Save the following config for collecting RDS logs in a file named `postgres-logs-collection-config.yaml`

```yaml
receivers:
  awscloudwatch:
    region: us-east-1
    logs:
      poll_interval: 1m
      groups:
        named:
          # replace the following name with your log group for RDS logs
          /aws/rds/:

processors:
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s

exporters:
  # export to SigNoz cloud
  otlp/postgres-logs:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  # otlp/postgres-logs:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true


service:
  pipelines:
    logs/postgres:
      receivers: [awscloudwatch]
      processors: [batch]
      exporters: [otlp/postgres-logs]
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
--config postgres-logs-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

