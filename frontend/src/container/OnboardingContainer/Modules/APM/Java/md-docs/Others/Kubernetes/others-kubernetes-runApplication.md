Once you are done intrumenting your Java application, you can run it using the below command

```bash
java -javaagent:<path>/opentelemetry-javaagent.jar -jar {{MYAPP}}.jar
```

<path> - update it to the path where you downloaded the Java JAR agent in previous step

**Note:**
- In case you're dockerising your application, make sure to dockerise it along with OpenTelemetry instrumentation done in previous step.
