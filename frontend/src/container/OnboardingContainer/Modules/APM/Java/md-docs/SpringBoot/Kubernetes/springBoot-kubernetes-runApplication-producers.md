&nbsp;

Once you are done instrumenting your Java application, you can run it using the below commands

**Note:**
- Ensure you have Java and Maven installed. Compile your Java producer applications: Ensure your producer apps are compiled and ready to run.

**Run Producer App with Java Agent:**

```bash
java -javaagent:/path/to/opentelemetry-javaagent.jar \
     -Dotel.service.name=producer-svc \
     -Dotel.traces.exporter=otlp \
     -Dotel.metrics.exporter=otlp \
     -Dotel.logs.exporter=otlp \
     -jar /path/to/your/producer.jar
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step
<my-app> - Jar file of your application

&nbsp;

**Note:**
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/springboot/#troubleshooting-your-installation) for assistance.