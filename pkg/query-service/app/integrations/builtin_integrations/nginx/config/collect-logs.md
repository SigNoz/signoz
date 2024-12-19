### Collect Nginx Logs

You can configure Nginx logs collection by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting Nginx logs in a file named `nginx-logs-collection-config.yaml`

```yaml
receivers:
  filelog/nginx-access-logs:
    include: ["${env:NGINX_ACCESS_LOG_FILE}"]
    operators:
      # Parse the default nginx access log format. Nginx defaults to the "combined" log format
      # $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
      # For more details, see https://nginx.org/en/docs/http/ngx_http_log_module.html
      - type: regex_parser
        if: body matches '^(?P<remote_addr>[0-9\\.]+) - (?P<remote_user>[^\\s]+) \\[(?P<ts>.+)\\] "(?P<request_method>\\w+?) (?P<request_path>.+?)" (?P<status>[0-9]+) (?P<body_bytes_sent>[0-9]+) "(?P<http_referrer>.+?)" "(?P<http_user_agent>.+?)"$'
        parse_from: body
        parse_to: attributes
        regex: '^(?P<remote_addr>[0-9\.]+) - (?P<remote_user>[^\s]+) \[(?P<ts>.+)\] "(?P<request_method>\w+?) (?P<request_path>.+?)" (?P<status>[0-9]+) (?P<body_bytes_sent>[0-9]+) "(?P<http_referrer>.+?)" "(?P<http_user_agent>.+?)"$'
        timestamp:
          parse_from: attributes.ts
          layout: "02/Jan/2006:15:04:05 -0700"
          layout_type: gotime
        severity:
          parse_from: attributes.status
          overwrite_text: true
          mapping:
            debug: "1xx"
            info:
              - "2xx"
              - "3xx"
            warn: "4xx"
            error: "5xx"
      - type: remove
        if: attributes.ts != nil
        field: attributes.ts
      - type: add
        field: attributes.source
        value: nginx

  filelog/nginx-error-logs:
    include: ["${env:NGINX_ERROR_LOG_FILE}"]
    operators:
      # Parse the default nginx error log format.
      # YYYY/MM/DD HH:MM:SS [LEVEL] PID#TID: *CID MESSAGE
      # For more details, see https://github.com/phusion/nginx/blob/master/src/core/ngx_log.c
      - type: regex_parser
        if: body matches '^(?P<ts>.+?) \\[(?P<log_level>\\w+)\\] (?P<pid>\\d+)#(?P<tid>\\d+). \\*(?P<cid>\\d+) (?P<message>.+)$'
        parse_from: body
        parse_to: attributes
        regex: '^(?P<ts>.+?) \[(?P<log_level>\w+)\] (?P<pid>\d+)#(?P<tid>\d+). \*(?P<cid>\d+) (?P<message>.+)$'
        timestamp:
          parse_from: attributes.ts
          layout: "2006/01/02 15:04:05"
          layout_type: gotime
        severity:
          parse_from: attributes.log_level
          overwrite_text: true
          mapping:
            debug: "debug"
            info:
              - "info"
              - "notice"
            warn: "warn"
            error:
              - "error"
              - "crit"
              - "alert"
            fatal: "emerg"
      - type: remove
        if: attributes.ts != nil
        field: attributes.ts
      - type: move
        if: attributes.message != nil
        from: attributes.message
        to: body
      - type: add
        field: attributes.source
        value: nginx

processors:
  batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s

exporters:
  # export to SigNoz cloud
  otlp/nginx-logs:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  # otlp/nginx-logs:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true

service:
  pipelines:
    logs/nginx:
      receivers: [filelog/nginx-access-logs, filelog/nginx-error-logs]
      processors: [batch]
      exporters: [otlp/nginx-logs]

```

### If using non-default nginx log format, adjust log parsing regex

If you are using a [custom nginx log format](https://docs.nginx.com/nginx/admin-guide/monitoring/logging/#setting-up-the-access-log),
please adjust the regex used for parsing logs in the receivers named
`filelog/nginx-access-logs` and `filelog/nginx-error-logs` in  collector config.


#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# path of Nginx access log file. must be accessible by the otel collector
# typically found at /usr/local/var/log/nginx/access.log on macOS
export NGINX_ACCESS_LOG_FILE=/var/log/nginx/access.log

# path of Nginx error log file. must be accessible by the otel collector
# typically found at /usr/local/var/log/nginx/error.log on macOS
export NGINX_ERROR_LOG_FILE=/var/log/nginx/error.log

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config nginx-logs-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.
