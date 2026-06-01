## Setup OpenTelemetry Binary as an agent

&nbsp;

As a first step, you should install the OTel collector Binary according to the instructions provided on [this link](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/).

&nbsp;

While creating the `config.yaml` during the installation fo the OTel Collector Binary, you need to enable CORS under the receivers section so that you don't get CORS error while sending your Traces to SigNoz Cloud. See the code snippet below to understand how you can enable CORS in your config file:

```yaml

      http:
+        cors:
+          allowed_origins:
+            - <Frontend-application-URL>  # URL of your Frontend application. Example -> http://localhost:4200, https://netflix.com etc.

```

`<Frontend-application-URL>` - URL where your frontend application is running. For Example, `http://localhost:4200` or `https://netflix.com` etc.

**NOTE:** Make sure to restart your collector after making the config changes


Once you are done setting up the OTel collector binary and enabling CORS, you can follow the next steps.

&nbsp;

