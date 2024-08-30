**Step 1.** Install OpenTelemetry Collector binary

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. 

While creating the `config.yaml` during the installation fo the OTel Collector Binary, you need to enable CORS under the receivers section of the config file. This is needed so that you don't get 
CORS error which can hinder sending your Traces to SigNoz Cloud. See the code snippet below to understand how you can enable CORS in your config file:

&nbsp;

```yml
      http:
+        cors:
+          allowed_origins:
+            - <Frontend-application-URL>  # URL of your Frontend application. Example -> http://localhost:4200, https://netflix.com etc.
```
`<Frontend-application-URL>` - URL where your frontend application is running. For Example, http://localhost:4200 or https://netflix.com etc.

**NOTE:** Make sure to restart your collector after making the config changes