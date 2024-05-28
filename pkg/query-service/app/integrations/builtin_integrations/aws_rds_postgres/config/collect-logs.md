### Collect RDS Logs

#### Create collector config file

Save the following config for collecting RDS logs in a file named `postgres-logs-collection-config.yaml`. Make sure to update the log group name under the `named` section.

```yaml
receivers:
  awscloudwatch/rds_postgres_logs:
    region: us-east-1
    logs:
      poll_interval: 1m
      groups:
        named:
          # replace the following name with your log group for RDS logs
          /aws/rds/:

processors:
  attributes/add_source:
    actions:
      - key: source
        value: "rds_postgres"
        action: insert
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s
  logstransform/parse_rds_postgres_logs:
      operators:
          - id: 8641732b-6e58-4673-aeeb-d656f70a67e5
            if: body != nil && body matches "^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2} UTC)::@:\\[\\d+\\]:(?P<log_level>[A-Z]+):\\s*(?P<message>.*)$$"
            on_error: send
            output: a3343030-5ad7-4859-82aa-aa59a9cf0e79
            parse_from: body
            parse_to: attributes
            regex: ^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC)::@:\[\d+\]:(?P<log_level>[A-Z]+):\s*(?P<message>.*)$$
            type: regex_parser
          - id: a3343030-5ad7-4859-82aa-aa59a9cf0e79
            if: attributes?.log_level != nil && ( type(attributes.log_level) == "string" || ( type(attributes.log_level) in ["int", "float"] && attributes.log_level == float(int(attributes.log_level)) ) )
            mapping:
              debug:
                  - DEBUG1
                  - DEBUG2
                  - DEBUG3
                  - DEBUG4
                  - DEBUG5
              error:
                  - ERROR
              fatal:
                  - FATAL
                  - PANIC
              info:
                  - INFO
                  - LOG
                  - NOTICE
                  - DETAIL
              trace:
                  - TRACE
              warn:
                  - WARNING
            output: fd93f35e-9cbd-4ab8-b1ed-ff90c53b7d9a
            overwrite_text: true
            parse_from: attributes.log_level
            type: severity_parser
          - field: attributes.log_level
            id: fd93f35e-9cbd-4ab8-b1ed-ff90c53b7d9a
            if: attributes?.log_level != nil
            type: remove

exporters:
  # export to SigNoz cloud
  otlp/postgres-logs:
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
    logs/postgres:
      receivers: [awscloudwatch/rds_postgres_logs]
      processors: [attributes/add_source, logstransform/parse_rds_postgres_logs, batch]
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

