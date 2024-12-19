## Application level Tracing

For application-level tracing, you can use the OpenTelemetry SDKs integrated with your application. These SDKs will automatically collect and forward traces to the Central Collector.

&nbsp;

To see how you can instrument your applications like FastAPI, NextJS, Node.js, Spring etc. you can check out the **Application Monitoring** section available at the start of this onboarding or you can checkout this [documentation](https://signoz.io/docs/instrumentation/).

&nbsp;

## Prerequisites

1. **Azure Subscription & App Service**: You need an active Azure subscription with a running Azure App Service instance.
2. **Central Collector Setup**: Make sure you have set up the Central Collector 

&nbsp;

## Configure the OpenTelemetry SDK

```bash
# Set env vars or config file
export OTEL_EXPORTER_OTLP_ENDPOINT="http://<Your-Central-Collector-DNS>:4318/"
```

For application-level traces, configure your application to use the DNS name of the **Central Collector** you set up earlier. This Central Collector will automatically forward the collected data to SigNoz.

&nbsp;

If you encounter any difficulties, please refer to this [troubleshooting section](https://signoz.io/docs/azure-monitoring/az-container-apps/tracing/#troubleshooting) 