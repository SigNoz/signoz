### Enable the instrumentation agent and run your application

If you run your .war package by putting in webapps folder, just add setenv.sh in your Tomcat bin folder.

This should set the environment variable and start sending telemetry data to SigNoz Cloud.

```bash
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/<path>/opentelemetry-javaagent.jar"
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step

**Note:**
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.