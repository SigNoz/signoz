## Application level Tracing

For application-level tracing, you can use the OpenTelemetry SDKs integrated with your application. These SDKs will automatically collect and forward traces to the Central Collector.

&nbsp;

To see how you can instrument your applications like FastAPI, NextJS, Node.js, Spring etc. you can check out the **Application Monitoring** section available at the start of this onboarding or you can checkout this [documentation](https://signoz.io/docs/instrumentation/).

## Configure the OpenTelemetry SDK

```bash
# Set env vars or config file
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector.kubelet-otel.svc.cluster.local:4318/"
```

For application-level traces and metrics, configure your application to use the `kube-dns` name of the **Central Collector** you set up earlier.