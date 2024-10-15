### Running your Ruby application

Run the application using the below command:

```bash
OTEL_EXPORTER=otlp \
OTEL_SERVICE_NAME={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT=http://$(Otel-agent-IP):4318 \
rails server
```

**Note:** Checkout this [documentation](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/#send-data-from-instrumented-applications) to understand how to get the `Otel-agent-IP`.

