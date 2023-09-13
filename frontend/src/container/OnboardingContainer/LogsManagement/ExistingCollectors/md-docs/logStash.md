If you use logstash to collect logs in your stack with this tutotrial you will be able to send logs from logstash to SigNoz.

At SigNoz we use opentelemetry collector to recieve logs which supports the TCP protocol. So you can forward your logs from your logstash agent to opentelemetry collector

## Steps to recieve logs from Logstash:

- Add fluentforward reciever to your `otel-collector-config.yaml` which is present inside `deploy/docker/clickhouse-setup`

  ```
  receivers:
    tcplog/logstash:
      max_log_size: 1MiB
      listen_address: "0.0.0.0:2255"
      attributes: {}
      resource: {}
      add_attributes: false
      operators: []
  ```

  Here we have used port 2255 for listing in TCP protocol, but you can change it to a port you want.
  You can read more about tcplog reciver [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/tcplogreceiver).

- Update the pipleline for logs and make the following change in `otel-collector-config.yaml`

  ```
  service:
    ...

    logs:
      receivers: [ otlp, tcplog/logstash ]
      processors: [ batch ]
      exporters: [  clickhouselogsexporter ]
  ```

  Here we are adding our clickhouse exporter and creating a pipeline which will collect logs from `tcplog/logstash` receiver, processing it using batch processor and export it to clickhouse.

- Expose the port in port for otel-collector in `docker-compose.yaml` file present in `deploy/docker/clickhouse-setup`

  ```
  otel-collector:
    ...
    ports:
      - "2255:2255"
  ```

- Change the logstash config to forward the logs to otel collector.

  ```
  output {
    tcp {
      codec => json_lines # this is required otherwise it will send eveything in a single line
      host => "otel-collector-host"
      port => 2255
    }
  }
  ```

  In this example we are generating sample logs and then forwarding them to the otel collector which is listening on port 2255.
  `otel-collector-host` has to be replaced by the host where otel-collector is running. For more info check [troubleshooting](../install/troubleshooting.md#signoz-otel-collector-address-grid).

- Once you make this changes you can restart logstash and SignNoz, and you will be able to see the logs in SigNoz.
- To properly transform your existing log model into opentelemetry [log](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md) model you can use the different processors provided by opentelemetry. [link](./logs.md#processors-available-for-processing-logs)
