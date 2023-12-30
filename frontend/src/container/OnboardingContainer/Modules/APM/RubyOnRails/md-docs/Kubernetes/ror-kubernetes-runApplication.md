### Running your Ruby application

Run the application using the below command:

```bash
OTEL_EXPORTER=otlp \
OTEL_SERVICE_NAME={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
rails server
```