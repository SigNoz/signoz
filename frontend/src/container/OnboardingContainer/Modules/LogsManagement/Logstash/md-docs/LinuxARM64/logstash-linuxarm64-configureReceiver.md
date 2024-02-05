### Step 1: Add logstash receiver

Add the logstash receiver in the receivers section of `config.yaml` file of the **`otecol-contrib`** directory that you created in the previous step.

```bash
receivers:
  tcplog/logstash:
    max_log_size: 1MiB
    listen_address: "0.0.0.0:2255"
    attributes: {}
    resource: {}
    add_attributes: false
    operators: []
```

Here we have used port 2255 for listening in TCP protocol, but you can change it to a port you want. You can read more about tcplog reciver [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/tcplogreceiver).

&nbsp;

Modify your config.yaml and add the above receiver
```bash
service:
    ....
    logs:
        receivers: [otlp, tcplog/logstash]
        processors: [batch]
        exporters: [otlp]
```
&nbsp;

### Step 2: Update the logstash config file
Add the following to your **logstash config** to forward the logs to otel collector.
```bash
output {
  tcp {
    codec => json_lines # this is required otherwise it will send eveything in a single line
    host => "localhost"
    port => 2255
  }
}
```
We are assuming that you are running the logstash binary on the host. If not, the value of host might change depending on your environment.

- For MacOS - host is `host.docker.internal`
- For other systems - host is IP address of your system