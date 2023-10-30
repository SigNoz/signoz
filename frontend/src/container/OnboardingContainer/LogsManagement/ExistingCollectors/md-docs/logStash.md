## Collect Logs Using Logstash in SigNoz cloud

If you use logstash to collect logs in your stack, you will be able to send logs from Logstash to SigNoz.

At SigNoz we use OpenTelemetry Collector to recieve logs which supports the TCP protocol. So you can forward your logs from the logstash agent to opentelemetry collector.

* Add otel collector binary to your VM by following this [guide](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/).

* Add the reciever to your `config.yaml` 
  ```yaml
  receivers:
    tcplog/logstash:
      max_log_size: 1MiB
      listen_address: "0.0.0.0:2255"
      attributes: {}
      resource: {}
      add_attributes: false
      operators: []
  ```
  Here we have used port 2255 for listening in TCP protocol, but you can change it to a port you want.
  You can read more about tcplog reciver [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/tcplogreceiver).

* Modify your `config.yaml` and add the above receiver
  ```yaml {4}
  service:
      ....
      logs:
          receivers: [otlp, tcplog/logstash]
          processors: [batch]
          exporters: [otlp]
  ```
  
* Change the logstash config to forward the logs to otel collector.
  ```
  output {
    tcp {
      codec => json_lines # this is required otherwise it will send eveything in a single line
      host => "localhost"
      port => 2255
    }
  }
  ```
  Here we are configuring logstash to send logs to otel-collector that we ran in the previous step, which is listening on port 2255.
  Also we are assuming that you are running the logstash binary on the host. If not, the value of `host` might change depending on your environment. 

*  Once you make this changes you can otel binary and logstash, and you will be able to see the logs in SigNoz.

*  To properly transform your existing log model into opentelemetry [log](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md) model you can use the different processors provided by opentelemetry ([link](https://signoz.io/docs/userguide/logs/#processors-available-for-processing-logs)).