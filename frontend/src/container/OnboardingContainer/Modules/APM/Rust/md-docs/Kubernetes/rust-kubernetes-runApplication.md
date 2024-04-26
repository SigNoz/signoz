### Running your Rust application

Run the application using the below command:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}} cargo run
```