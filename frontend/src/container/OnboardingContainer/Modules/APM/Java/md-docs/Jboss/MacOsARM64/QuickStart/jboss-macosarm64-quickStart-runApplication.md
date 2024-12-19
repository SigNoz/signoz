### Open `standalone.conf` Configuration File
```bash
vim /opt/jboss-eap-7.1/bin/standalone.conf
```
&nbsp;

### Update `JAVA_OPTS` environment variable
Update `JAVA_OPTS` environment variable with configurations required to send data to SigNoz cloud in your configuration file.

```bash
JAVA_OPTS="-javaagent:/<path>/opentelemetry-javaagent.jar
-Dotel.exporter.otlp.endpoint=https://ingest.{{REGION}}.signoz.cloud:443
-Dotel.exporter.otlp.headers="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}"
-Dotel.resource.attributes="service.name={{MYAPP}}""
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step

&nbsp;

#### (Optional step) Write the output/logs of standalone.sh script to a file nohup.out as a background thread
```bash
/opt/jboss-eap-7.1/bin/standalone.sh > /opt/jboss-eap-7.1/bin/nohup.out &

```
&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/jboss/#troubleshooting-your-installation) for assistance.