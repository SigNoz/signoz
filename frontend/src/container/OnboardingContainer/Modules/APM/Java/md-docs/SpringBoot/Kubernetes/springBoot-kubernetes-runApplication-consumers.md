&nbsp;

Once you are done instrumenting your Java application, you can run it using the below commands

**Note:**
- Ensure you have Java and Maven installed. Compile your Java consumer applications: Ensure your consumer apps are compiled and ready to run.

**Run Consumer App with Java Agent:**

```bash
java -javaagent:/path/to/opentelemetry-javaagent.jar \
     -Dotel.service.name=consumer-svc \
     -Dotel.traces.exporter=otlp \
     -Dotel.metrics.exporter=otlp \
     -Dotel.logs.exporter=otlp \
     -Dotel.instrumentation.kafka.producer-propagation.enabled=true \
     -Dotel.instrumentation.kafka.experimental-span-attributes=true \
     -Dotel.instrumentation.kafka.metric-reporter.enabled=true \
     -jar /path/to/your/consumer.jar
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step
<my-app> - Jar file of your application

&nbsp;

**Note:**
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.

&nbsp;

If you encounter any difficulties, please consult the [troubleshooting section](https://signoz.io/docs/instrumentation/springboot/#troubleshooting-your-installation) for assistance.