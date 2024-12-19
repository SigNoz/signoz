 
**Step 1.** Download otel java binary agent

```bash
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```
&nbsp;

**Step 2.** Edit your configuration file,i.e `standalone.conf` for JBoss with nano or notepad.
&nbsp;
&nbsp;
    
**Step 3.** Update `JAVA_OPTS` environment variable

Update `JAVA_OPTS` environment variable with configurations required to send data to SigNoz cloud in your configuration file.

```bash
set JAVA_OPTS=-javaagent:C:\path\to\opentelemetry-javaagent.jar
set JAVA_OPTS=%JAVA_OPTS% -Dotel.exporter.otlp.endpoint=https://ingest.{{REGION}}.signoz.cloud:443
set JAVA_OPTS=%JAVA_OPTS% -Dotel.exporter.otlp.headers="signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}"
set JAVA_OPTS=%JAVA_OPTS% -Dotel.resource.attributes="service.name={{MYAPP}}"
```
&nbsp;
&nbsp;
You need to replace the following things based on your environment:<br></br>

- `path` - Update it to the path of your downloaded Java JAR agent instead of `C:\path\to\opentelemetry-javaagent.jar`<br></br>
