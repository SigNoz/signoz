## Collect Logs Using FluentD in SigNoz cloud

If you use fluentD to collect logs in your stack, you will be able to send logs from fluentD to SigNoz.

At SigNoz, we use opentelemetry collector to recieve logs which supports the fluentforward protocol. So you can forward your logs from your fluentD agent to opentelemetry collector.

* Add otel collector binary to your VM by following this [guide](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/).

* Add fluentforward reciever to your `config.yaml` 
  ```yaml
  receivers:
    fluentforward:
      endpoint: 0.0.0.0:24224
  ```
  Here we have used port 24224 for listening in fluentforward protocol, but you can change it to a port you want.
  You can read more about fluentforward receiver [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/fluentforwardreceiver).

* Modify your `config.yaml` and add the above receiver
  ```yaml {4}
  service:
      ....
      logs:
          receivers: [otlp, fluentforward]
          processors: [batch]
          exporters: [otlp]
  ```

* Add the following to your fluentD config to forward the logs to otel collector.
  ```
  <match <directive>>
    @type forward
    send_timeout 60s
    recover_wait 10s
    hard_timeout 60s

    <server>
      name myserver1
      host localhost
      port 24224
    </server>
  </match>
  ```
  In this config we are matching a directive and forwarding logs to the otel collector which is listening on  port 24224. Replace `<directive>` with your directive name.
  Also we are assuming that you are running the fluentD binary on the host. If not, the value of `host` might change depending on your environment. 
*  Once you make this changes you can restart fluentD and otel-binary, and you will be able to see the logs in SigNoz.
  
*  To properly transform your existing log model into opentelemetry [log](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md) model you can use the different processors provided by opentelemetry. ([link](https://signoz.io/docs/userguide/logs/#processors-available-for-processing-logs))

    eg:-

    ```yaml
    processors:
      logstransform:
        operators:
          - type: trace_parser
            trace_id:
              parse_from: attributes.trace_id
            span_id:
              parse_from: attributes.span_id
          - type: remove
            field: attributes.trace_id
          - type: remove
            field: attributes.span_id
    ```

    The operations in the above processor will parse the trace_id and span_id from log to opentelemetry log model and remove them from attributes.