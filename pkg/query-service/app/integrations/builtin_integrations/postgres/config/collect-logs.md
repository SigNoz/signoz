### Collect Postgres Logs

#### Create collector config file

Save the following config for collecting postgres logs in a file named `postgres-logs-collection-config.yaml`

```yaml
receivers:
  filelog/postgresql:
    include: [${env:POSTGRESQL_LOG_FILE}]
    operators:
      - type: regex_parser
        regex: '^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?P<log_level>[A-Z]*) (?P<message>.*)$'
        timestamp:
          parse_from: attributes.ts
          layout: '%Y-%m-%d %H:%M:%S'
        severity:
          parse_from: attributes.log_level

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

