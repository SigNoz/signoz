### Running your Rust application

Run the application using the below command:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://$(Otel-agent-IP):4317 OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} cargo run
```

**Note:** Checkout this [documentation](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/#send-data-from-instrumented-applications) to understand how to get the `Otel-agent-IP`.