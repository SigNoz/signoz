### Step 1: Add syslog receiver to `config.yaml` file of otel collector

Add the syslog receiver in the receivers section of `config.yaml` file of the **`otecol-contrib`** directory that you created in the previous step

```bash
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
Here we are collecting the logs and moving message from attributes to body using operators that are available. You can read more about operators [here](https://signoz.io/docs/userguide/logs/#operators-for-parsing-and-manipulating-logs).
For more configurations that are available for syslog receiver please check [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/syslogreceiver).

### Step 2: Include syslog receiver in the pipeline
We will modify our pipeline inside config.yaml of otel-collector to include the receiver we have created.
```bash
service:
    ....
    logs:
        receivers: [otlp, syslog]
        processors: [batch]
        exporters: [otlp]
```
Restart the otel collector so that new changes are applied and we can forward our logs to port `54527`

### Step 3: Modify the `rsyslog.conf` file
Open your `rsyslog.conf` file present inside `/etc/` by running the following command :
```bash
sudo vim /etc/rsyslog.conf
```
if not using in production, add this at the end of the `rsyslog.conf` file 
```bash
template(
  name="UTCTraditionalForwardFormat"
  type="string"
  string="<%PRI%>%TIMESTAMP:::date-utc% %HOSTNAME% %syslogtag:1:32%%msg:::sp-if-no-1st-sp%%msg%"
)

*.* action(type="omfwd" target="0.0.0.0" port="54527" protocol="tcp" template="UTCTraditionalForwardFormat")
```

for production use cases, use this

```bash
template(
  name="UTCTraditionalForwardFormat"
  type="string"
  string="<%PRI%>%TIMESTAMP:::date-utc% %HOSTNAME% %syslogtag:1:32%%msg:::sp-if-no-1st-sp%%msg%"
)

*.*  action(type="omfwd" target="0.0.0.0" port="54527" protocol="tcp"
        action.resumeRetryCount="10"
        queue.type="linkedList" queue.size="10000" template="UTCTraditionalForwardFormat")
```

This will make retries and queue in place to de-couple the sending from other logging action. 

**Note** : 
We are assuming that you are running the otel binary on the same host. If not, the value of target might change depending on your environment.