## Enable the instrumentation agent and run your application
&nbsp;

If you run your .war package by putting in webapps folder, just add setenv.sh in your Tomcat bin folder.
&nbsp;

This should set the environment variable and start sending telemetry data to SigNoz Cloud.

```bash
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/<path>/opentelemetry-javaagent.jar"
```
&nbsp;

<path> - update it to the path where you downloaded the Java JAR agent in previous step

&nbsp;
&nbsp;

**Note:**
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/tomcat/#troubleshooting-your-installation) for assistance.