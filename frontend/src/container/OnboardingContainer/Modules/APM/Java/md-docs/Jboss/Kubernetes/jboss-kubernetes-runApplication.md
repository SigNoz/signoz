### Open `standalone.conf` Configuration File
```bash
vim /opt/jboss-eap-7.1/bin/standalone.conf
```

### Update `JAVA_OPTS` environment variable
```bash
JAVA_OPTS="-javaagent:/<path>/opentelemetry-javaagent.jar"
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step

**Note:**
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.
