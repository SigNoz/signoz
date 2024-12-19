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
      - type: regex_parser
        parse_from: body
        if: body matches '^(?P<ts>\\d{4}\\.\\d{2}\\.\\d{2} \\d{2}:\\d{2}:\\d{2}.?[0-9]*)\\s+\\[\\s+(\\x1b.*?m)?(?P<thread_id>\\d*)(\\x1b.*?m)?\\s+\\]\\s+{((\\x1b.*?m)?(?P<query_id>[0-9a-zA-Z-_]*)(\\x1b.*?m)?)?}\\s+<(\\x1b.*?m)?(?P<log_level>\\w*)(\\x1b.*?m)?>\\s+((\\x1b.*?m)?(?P<clickhouse_component>[a-zA-Z0-9_]+)(\\x1b.*?m)?:)?\\s+(?s)(?P<message>.*)$'
        regex: '^(?P<ts>\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}.?[0-9]*)\s+\[\s+(\x1b.*?m)?(?P<thread_id>\d*)(\x1b.*?m)?\s+\]\s+{((\x1b.*?m)?(?P<query_id>[0-9a-zA-Z-_]*)(\x1b.*?m)?)?}\s+<(\x1b.*?m)?(?P<log_level>\w*)(\x1b.*?m)?>\s+((\x1b.*?m)?(?P<clickhouse_component>[a-zA-Z0-9_]+)(\x1b.*?m)?:)?\s+(?s)(?P<message>.*)$'
      - type: time_parser
        if: attributes.ts != nil
        parse_from: attributes.ts
        layout_type: gotime
        layout: 2006.01.02 15:04:05.999999
        location: ${env:CLICKHOUSE_TIMEZONE}
      - type: remove
        if: attributes.ts != nil
        field: attributes.ts
      - type: severity_parser
        if: attributes.log_level != nil
        parse_from: attributes.log_level
        overwrite_text: true
        # For mapping details, see getPriorityName defined in https://github.com/ClickHouse/ClickHouse/blob/master/src/Interpreters/InternalTextLogsQueue.cpp
        mapping:
          trace:
            - Trace
            - Test
          debug: Debug
          info:
            - Information
            - Notice
          warn: Warning
          error: Error
          fatal:
            - Fatal
            - Critical
      - type: remove
        if: attributes.log_level != nil
        field: attributes.log_level
      - type: move
        if: attributes.message != nil
        from: attributes.message
        to: body
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
export CLICKHOUSE_LOG_FILE="/var/log/clickhouse-server/server.log"

# Locale of the clickhouse server.
# Clickhouse logs timestamps in it's locale without TZ info
# Timezone setting can be found in clickhouse config. For details see https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#timezone
# Must be a IANA timezone name like Asia/Kolkata. For examples, see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
export CLICKHOUSE_TIMEZONE="Etc/UTC"

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

