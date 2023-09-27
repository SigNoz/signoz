## Collect Syslogs in SigNoz cloud

- Add otel collector binary to your VM by following this [guide](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/).

- Add the syslog reciever to `config.yaml` to otel-collector.

  ```yaml {2-10}
  receivers:
   syslog:
    tcp:
     listen_address: '0.0.0.0:54527'
    protocol: rfc3164
    location: UTC
    operators:
     - type: move
       from: attributes.message
       to: body
  ```

  Here we are collecting the logs and moving message from attributes to body using operators that are available.
  You can read more about operators [here](https://signoz.io/docs/userguide/logs/#operators-for-parsing-and-manipulating-logs).

  For more configurations that are available for syslog receiver please check [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/syslogreceiver).

- Next we will modify our pipeline inside `config.yaml` of otel-collector to include the receiver we have created above.

  ```yaml {4}
  service:
      ....
      logs:
          receivers: [otlp, syslog]
          processors: [batch]
          exporters: [otlp]
  ```

- Now we can restart the otel collector so that new changes are applied and we can forward our logs to port `54527`.

- Modify your `rsyslog.conf` file present inside `/etc/` by running the following command:

  ```bash
  sudo vim /etc/rsyslog.conf
  ```

  and adding the this line at the end

  ```
  template(
    name="UTCTraditionalForwardFormat"
    type="string"
    string="<%PRI%>%TIMESTAMP:::date-utc% %HOSTNAME% %syslogtag:1:32%%msg:::sp-if-no-1st-sp%%msg%"
  )

  *.* action(type="omfwd" target="0.0.0.0" port="54527" protocol="tcp" template="UTCTraditionalForwardFormat")
  ```

  For production use cases it is recommended to use something like below:

  ```
  template(
    name="UTCTraditionalForwardFormat"
    type="string"
    string="<%PRI%>%TIMESTAMP:::date-utc% %HOSTNAME% %syslogtag:1:32%%msg:::sp-if-no-1st-sp%%msg%"
  )

  *.*  action(type="omfwd" target="0.0.0.0" port="54527" protocol="tcp"
          action.resumeRetryCount="10"
          queue.type="linkedList" queue.size="10000" template="UTCTraditionalForwardFormat")
  ```
  So that you have retries and queue in place to de-couple the sending from other logging action. Also, we are assuming that you are running the otel binary on the same host. If not, the value of target might change depending on your environment.

- Now restart your rsyslog service by running `sudo systemctl restart rsyslog.service`

- You can check the status of service by running `sudo systemctl status rsyslog.service`

- If there are no errors your logs will be visible on SigNoz UI.
