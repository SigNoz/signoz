 
**Step 1.** Download otel java binary agent

```bash
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

**Step 2.** Edit your configuration file,i.e `standalone.conf` for JBoss with nano or notepad.
    
**Step 3.** Update `JAVA_OPTS` environment variable

Update `JAVA_OPTS` environment variable with configurations required to send data to SigNoz cloud in your configuration file.

```bash
set JAVA_OPTS=-javaagent:C:\path\to\opentelemetry-javaagent.jar
set JAVA_OPTS=%JAVA_OPTS% -Dotel.exporter.otlp.endpoint=https://ingest.{region}.signoz.cloud:443
set JAVA_OPTS=%JAVA_OPTS% -Dotel.exporter.otlp.headers="signoz-access-token=SIGNOZ_INGESTION_KEY"
set JAVA_OPTS=%JAVA_OPTS% -Dotel.resource.attributes="service.name=<app_name>"
```
You need to replace the following things based on your environment:<br></br>

- `path` - Update it to the path of your downloaded Java JAR agent instead of `C:\path\to\opentelemetry-javaagent.jar`<br></br>
- `<app_name>` is the name for your application
- `SIGNOZ_INGESTION_KEY` is the API token provided by SigNoz. You can find your ingestion key from SigNoz cloud account details sent on your email.

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

| Region | Endpoint |
| --- | --- |
| US |	ingest.us.signoz.cloud:443 |
| IN |	ingest.in.signoz.cloud:443 |
| EU | ingest.eu.signoz.cloud:443 |
