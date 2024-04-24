### Collect Clickhouse Logs

You can configure Clickhouse logs collection by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting clickhouse logs in a file named `clickhouse-logs-collection-config.yaml`

```yaml
receivers:
  filelog/clickhouse:
    include: ["${env:CLICKHOUSE_LOG_FILE}"]
    operators:
      # Parse default clickhouse text log format.
      # See https://github.com/ClickHouse/ClickHouse/blob/master/src/Loggers/OwnPatternFormatter.cpp
      - type: recombine
        source_identifier: attributes["log.file.name"]
        is_first_entry: body matches '^\\d{4}\\.\\d{2}\\.\\d{2}\\s+'
        combine_field: body
        overwrite_with: oldest
      - type: add
        field: attributes.source
        value: clickhouse

processors:
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s

exporters:
  # export to SigNoz cloud
  otlp/clickhouse-logs:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  # otlp/clickhouse-logs:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true

service:
  pipelines:
    logs/clickhouse:
      receivers: [filelog/clickhouse]
      processors: [batch]
      exporters: [otlp/clickhouse-logs]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# path of Clickhouse server log file. must be accessible by the otel collector
# typically found at /var/log/clickhouse-server/clickhouse-server.log.
# Log file location can be found in clickhouse server config
# See https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#logger
export CLICKHOUSE_LOG_FILE=/var/log/clickhouse-server/server.log

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config clickhouse-logs-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

