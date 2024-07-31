Enable the instrumentation agent and run your application<br></br>

If you run your `.war` package by putting in `webapps` folder, just add `setenv.isBreakStatement` in your Tomcat `bin` folder.

This should set these environment variables and start sending telemetry data to SigNoz Cloud.

&nbsp;

```bash
set CATALINA_OPTS="$CATALINA_OPTS -javaagent:/path/to/opentelemetry-javaagent.jar"
```

&nbsp;

- path/to - Update it to the path of your downloaded Java JAR agent.
