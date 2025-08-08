# SigNoz OTel Collector Development Environment

This directory contains the Docker Compose setup for running the SigNoz OpenTelemetry Collector locally during development.

## What it does

- Starts the SigNoz OTel Collector container
- Exposes OTLP endpoints for receiving telemetry data:
  - **gRPC**: `localhost:4317`
  - **HTTP**: `localhost:4318`
- Connects to ClickHouse running on the host machine
- Processes and forwards telemetry data to ClickHouse

## Usage

```bash
# Start the OTel Collector
make devenv-otel-collector

# Or start both ClickHouse and OTel Collector together
make devenv-up
```

## Prerequisites

- ClickHouse must be running (use `make devenv-clickhouse`)
- Docker must be installed and running

## Testing

Send a test trace to verify everything is working:

```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"test-service"}}]},"scopeSpans":[{"spans":[{"traceId":"12345678901234567890123456789012","spanId":"1234567890123456","name":"test-span","startTimeUnixNano":"1609459200000000000","endTimeUnixNano":"1609459201000000000"}]}]}]}'
```

## Configuration

- `compose.yaml`: Docker Compose configuration for the OTel Collector
- `otel-collector-config.yaml`: OpenTelemetry Collector configuration file

The configuration is set up to connect to ClickHouse via `host.docker.internal:9000`, which allows the containerized collector to reach ClickHouse running on the host machine.