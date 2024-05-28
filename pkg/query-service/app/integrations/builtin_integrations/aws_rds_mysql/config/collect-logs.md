### Collect RDS Logs

#### Create collector config file

Save the following config for collecting RDS logs in a file named `mysql-logs-collection-config.yaml`

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
  attributes/add_source:
    actions:
      - key: source
        value: "rds_mysql"
        action: insert
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s

  logstransform/rds_mysql_logs:
    operators:
      - id: 89d069ca-1656-40c3-bc57-3a3e08ecf8da
        if: >-
          body != nil && body matches
          "^(?P<timestamp>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d+Z)
          (?P<thread>\\d+) \\[(?P<label>[^\\]]+)\\] \\[(?P<err_code>[^\\]]+)\\]
          \\[(?P<subsystem>[^\\]]+)\\] (?P<message>.*)$$"
        on_error: send
        output: 4b6cd164-5929-4d13-ae85-eed40b0f1a40
        parse_from: body
        parse_to: attributes
        regex: >-
          ^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)
          (?P<thread>\d+) \[(?P<label>[^\]]+)\] \[(?P<err_code>[^\]]+)\]
          \[(?P<subsystem>[^\]]+)\] (?P<message>.*)$$
        type: regex_parser
      - id: 4b6cd164-5929-4d13-ae85-eed40b0f1a40
        if: >-
          attributes?.label != nil && ( type(attributes.label) == "string" || (
          type(attributes.label) in ["int", "float"] && attributes.label ==
          float(int(attributes.label)) ) )
        mapping:
          debug:
            - Debug
            - Debug2
            - Debug3
          error:
            - Error
          fatal:
            - Error
            - Internal Error
          info:
            - Informational
          trace:
            - trace
          warn:
            - Warning
        output: 4e5220cf-f4e2-40b9-8215-15caaa51a269
        overwrite_text: true
        parse_from: attributes.label
        type: severity_parser
      - field: attributes.label
        id: 4e5220cf-f4e2-40b9-8215-15caaa51a269
        if: attributes?.label != nil
        type: remove

exporters:
  # export to SigNoz cloud
  otlp/mysql-logs:
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
    logs/mysql:
      receivers: [awscloudwatch]
      processors: [attributes/add_source, logstransform/rds_mysql_logs, batch]
      exporters: [otlp/mysql-logs]
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
--config mysql-logs-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

