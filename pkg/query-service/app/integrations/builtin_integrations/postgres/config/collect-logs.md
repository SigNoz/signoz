### Collect Postgres Logs

#### Create collector config file

Save the following config for collecting postgres logs in a file named `postgres-logs-collection-config.yaml`

```yaml
receivers:
  filelog/postgresql:
    include: ["${env:POSTGRESQL_LOG_FILE}"]
    start_at: beginning
    operators:
      - type: regex_parser
        if: body matches '^(?P<ts>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.?[0-9]*? [A-Z]*) \\[(?P<pid>[0-9]+)\\] (?P<log_level>[A-Z]*). (?P<message>.*)$'
        parse_from: body
        regex: '^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.?[0-9]*? [A-Z]*) \[(?P<pid>[0-9]+)\] (?P<log_level>[A-Z]*). (?P<message>.*)$'
        timestamp:
          parse_from: attributes.ts
          layout: '%Y-%m-%d %H:%M:%S %Z'
        severity:
          parse_from: attributes.log_level
          mapping:
            debug:
              - DEBUG1
              - DEBUG2
              - DEBUG3
              - DEBUG4
              - DEBUG5
            info:
              - INFO
              - LOG
              - NOTICE
              - DETAIL
            warning: WARNING
            error: ERROR
            fatal:
              - FATAL
              - PANIC
        on_error: send
      - type: move
        if: attributes.message != nil
        from: attributes.message
        to: body
      - type: remove
        if: attributes.log_level != nil
        field: attributes.log_level
      - type: remove
        if: attributes.ts != nil
        field: attributes.ts
      - type: add
        field: attributes.source
        value: postgres

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

service:
  pipelines:
    postgresql:
      receivers: [filelog/postgresql]
      processors: [batch]
      exporters: [otlp/postgresql-logs]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# path of postgresql log file
export POSTGRESQL_LOG_FILE=/usr/local/var/log/postgres.log

# region specific signoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your signoz ingestion key
export SIGNOZ_INGESTION_KEY="key"

```

#### Use collector config file

Make the `postgres-logs-collection-config.yaml` file available to your otel collector and add the flag `--config postgres-logs-collection-config.yaml` to the command for running your otel collector.    
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

