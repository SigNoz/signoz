### Open `standalone.conf` Configuration File
```bash
vim /opt/jboss-eap-7.1/bin/standalone.conf
```
&nbsp;

### Update `JAVA_OPTS` environment variable
```bash
JAVA_OPTS="-javaagent:/<path>/opentelemetry-javaagent.jar"
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step
&nbsp;

**Note:**
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/jboss/#troubleshooting-your-installation) for assistance.