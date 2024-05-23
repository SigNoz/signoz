### Collect Clickhouse Query Logs

You can configure collection from system.query_log table in clickhouse by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting clickhouse query logs in a file named `clickhouse-query-logs-collection-config.yaml`

```yaml
receivers:
  clickhousesystemtablesreceiver/query_log:
    dsn: "${env:CLICKHOUSE_MONITORING_DSN}"
    cluster_name: "${env:CLICKHOUSE_CLUSTER_NAME}"
    query_log_scrape_config:
      scrape_interval_seconds: ${env:QUERY_LOG_SCRAPE_INTERVAL_SECONDS}
      min_scrape_delay_seconds: ${env:QUERY_LOG_SCRAPE_DELAY_SECONDS}

exporters:
  # export to SigNoz cloud
  otlp/clickhouse-query-logs:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  # otlp/clickhouse-query-logs:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true

service:
  pipelines:
    logs/clickhouse-query-logs:
      receivers: [clickhousesystemtablesreceiver/query_log]
      processors: []
      exporters: [otlp/clickhouse-query-logs]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# DSN for connecting to clickhouse with the monitoring user
# Replace monitoring:<PASSWORD> with `username:password` for your monitoring user
# Note: The monitoring user must be able to issue select queries on system.query_log table.
export CLICKHOUSE_MONITORING_DSN="tcp://monitoring:<PASSWORD>@clickhouse:9000/"

# If collecting query logs from a clustered deployment, specify a non-empty cluster name.
export CLICKHOUSE_CLUSTER_NAME=""

# Rows from query_log table will be collected periodically based on this setting
export QUERY_LOG_SCRAPE_INTERVAL_SECONDS=20

# Must be configured to a value greater than flush_interval_milliseconds setting for query_log.
# This setting can be found in the clickhouse server config
# For details see https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#query-log
# Setting a large enough value ensures all query logs for a particular time interval have been
# flushed before an attempt to collect them is made.
export QUERY_LOG_SCRAPE_DELAY_SECONDS=8

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config clickhouse-query-logs-collection-config.yaml
```
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

Also note that only 1 collector instance should be configured to collect query_logs.  
Using multiple collector instances or replicas with this config will lead to duplicate logs.
