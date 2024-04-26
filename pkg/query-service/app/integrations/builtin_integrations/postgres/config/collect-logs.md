### Collect Postgres Logs

You can configure Postgres logs collection by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting postgres logs in a file named `postgres-logs-collection-config.yaml`

```yaml
receivers:
  filelog/postgresql:
    include: ["${env:POSTGRESQL_LOG_FILE}"]
    operators:
      # Parse default postgresql text log format.
      # `log_line_prefix` postgres setting defaults to '%m [%p] ' which logs the timestamp and the process ID
      # See https://www.postgresql.org/docs/current/runtime-config-logging.html#GUC-LOG-LINE-PREFIX for more details
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
            warn: WARNING
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

  # export to local collector
  # otlp/postgres-logs:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true

service:
  pipelines:
    logs/postgresql:
      receivers: [filelog/postgresql]
      processors: [batch]
      exporters: [otlp/postgresql-logs]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# path of Postgres server log file. must be accessible by the otel collector
# typically found in /usr/local/var/log/postgresql on macOS
# running `SELECT pg_current_logfile();` can also give you the location of postgresql log file
export POSTGRESQL_LOG_FILE=/var/log/postgresql/postgresql.log

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

