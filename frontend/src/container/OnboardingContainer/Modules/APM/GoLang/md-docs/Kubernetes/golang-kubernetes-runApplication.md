&nbsp;

To run your Go Gin application, use the below command :

```bash
SERVICE_NAME={{MYAPP}} INSECURE_MODE=true OTEL_EXPORTER_OTLP_ENDPOINT=$(Otel-agent-IP):4317 go run main.go
```

**Note:** Checkout this [documentation](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/#send-data-from-instrumented-applications) to understand how to get the `Otel-agent-IP`.