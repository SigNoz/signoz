### Collect Redis Logs

You can configure Redis logs collection by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting redis logs in a file named `redis-logs-collection-config.yaml`

```yaml
receivers:
  filelog/redis:
    include: ["${env:REDIS_LOG_FILE}"]
    operators:
      # Parse default redis log format
      # pid:role timestamp log_level message
      - type: regex_parser
        if: body matches '^(?P<pid>\\d+):(?P<role>\\w+) (?P<ts>\\d{2} \\w+ \\d{4} \\d{2}:\\d{2}:\\d{2}\\.\\d+) (?P<log_level>[.\\-*#]) (?P<message>.*)$'
        parse_from: body
        regex: '^(?P<pid>\d+):(?P<role>\w+) (?P<ts>\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}\.\d+) (?P<log_level>[.\-*#]) (?P<message>.*)$'
        timestamp:
          parse_from: attributes.ts
          layout: '02 Jan 2006 15:04:05.000'
          layout_type: gotime
        severity:
          parse_from: attributes.log_level
          overwrite_text: true
          mapping:
            debug: '.'
            info:
              - '-'
              - '*'
            warn: '#'
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
        value: redis

processors:
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
  # otlp/redis-logs:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true


service:
  pipelines:
    logs/redis:
      receivers: [filelog/redis]
      processors: [batch]
      exporters: [otlp/redis-logs]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# path of Redis server log file. must be accessible by the otel collector
# typically found in /usr/local/var/log/redis on macOS
# log file location can also be found in the output of `redis-cli CONFIG GET : *`
export REDIS_LOG_FILE=/var/log/redis/redis-server.log

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

