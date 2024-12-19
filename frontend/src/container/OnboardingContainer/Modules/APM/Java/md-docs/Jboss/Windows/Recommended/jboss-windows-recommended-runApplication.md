Update `JAVA_OPTS` environment variable

Update `JAVA_OPTS` environment variable with configurations required to send data to SigNoz cloud in your configuration file.

```bash
JAVA_OPTS="-javaagent:C:/path/to/opentelemetry-javaagent.jar"
```
&nbsp;

where,
- `path` - Update it to the path of your downloaded Java JAR agent.<br></br>

In case you encounter an issue where all applications do not get listed in the services section then please refer to the [troubleshooting section](#troubleshooting-your-installation).