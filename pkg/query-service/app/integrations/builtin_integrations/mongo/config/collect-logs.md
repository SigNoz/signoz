### Collect MongoDB Logs

You can configure MongoDB logs collection by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting MongoDB logs in a file named `mongodb-logs-collection-config.yaml`

```yaml
receivers:
  filelog/mongodb:
    include: ["${env:MONGODB_LOG_FILE}"]
    operators:
      # Parse structured mongodb logs
      # For more details, see https://www.mongodb.com/docs/manual/reference/log-messages/#structured-logging
      - type: json_parser
        if: body matches '^\\s*{\\s*".*}\\s*$'
        parse_from: body
        parse_to: attributes
        timestamp:
          parse_from: attributes.t.$$date
          layout: '2006-01-02T15:04:05.000-07:00'
          layout_type: gotime
        severity:
          parse_from: attributes.s
          overwrite_text: true
          mapping:
            debug:
              - D1
              - D2
              - D3
              - D4
              - D5
            info: I
            warn: W
            error: E
            fatal: F
      - type: flatten
        if: attributes.attr != nil
        field: attributes.attr
      - type: move
        if: attributes.msg != nil
        from: attributes.msg
        to: body
      - type: move
        if: attributes.c != nil
        from: attributes.c
        to: attributes.component
      - type: move
        if: attributes.id != nil
        from: attributes.id
        to: attributes.mongo_log_id
      - type: remove
        if: attributes.t != nil
        field: attributes.t
      - type: remove
        if: attributes.s != nil
        field: attributes.s
      - type: add
        field: attributes.source
        value: mongodb

processors:
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s

exporters:
  # export to SigNoz cloud
  otlp/mongodb-logs:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  # otlp/mongodb-logs:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true


service:
  pipelines:
    logs/mongodb:
      receivers: [filelog/mongodb]
      processors: [batch]
      exporters: [otlp/mongodb-logs]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# path of MongoDB server log file. must be accessible by the otel collector
# typically found in /usr/local/var/log/mongodb on macOS
# mongod.conf file can also be checked for finding log file location
export MONGODB_LOG_FILE=/var/log/mongodb/mongodb.log

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config mongodb-logs-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

