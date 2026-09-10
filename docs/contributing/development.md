# Development Guide

Welcome! This guide will help you set up your local development environment for SigNoz. Let's get you started! 🚀

## What do I need?

Before diving in, make sure you have these tools installed:

- **Git** - Our version control system
  - Download from [git-scm.com](https://git-scm.com/)

- **Go** - Powers our backend
  - Download from [go.dev/dl](https://go.dev/dl/)
  - Check [go.mod](../../go.mod#L3) for the minimum version

- **Node** - Powers our frontend
  - Download from [nodejs.org](https://nodejs.org)
  - Check [.nvmrc](../../frontend/.nvmrc) for the version

- **Pnpm** - Our frontend package manager
  - Follow the [installation guide](https://pnpm.io/installation)

- **Docker** - For running Clickhouse and Postgres locally
  - Get it from [docs.docker.com/get-docker](https://docs.docker.com/get-docker/)

> 💡 **Tip**: Run `make help` to see all available commands with descriptions

## How do I get the code?

1. Open your terminal
2. Clone the repository:
   ```bash
   git clone https://github.com/SigNoz/signoz.git
   ```
3. Navigate to the project:
   ```bash
   cd signoz
   ```

## How do I run it locally?

SigNoz has three main components: Clickhouse, Backend, and Frontend. Let's set them up one by one.

### 1. Setting up ClickHouse

First, we need to get ClickHouse running:

```bash
make devenv-clickhouse
```

This command:
- Starts ClickHouse in a single-shard, single-replica cluster
- Sets up Zookeeper
- Runs the latest schema migrations

### 2. Setting up SigNoz OpenTelemetry Collector

Next, start the OpenTelemetry Collector to receive telemetry data:

```bash
make devenv-signoz-otel-collector
```

This command:
- Starts the SigNoz OpenTelemetry Collector
- Listens on port 4317 (gRPC) and 4318 (HTTP) for incoming telemetry data
- Forwards data to ClickHouse for storage

> 💡 **Quick Setup**: Use `make devenv-up` to start both ClickHouse and OTel Collector together

### 3. Starting the Backend

1. Run the backend server:
   ```bash
   make go-run-community
   ```

2. Verify it's working:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```

   You should see: `{"status":"ok"}`

3. Stop it when you're done:
   ```bash
   make go-stop
   ```

> 💡 **Tip**: The API server runs at `http://localhost:8080/` by default. You can configure this using `apiserver.address` configuration option. See
> [running more than one instance](#how-do-i-run-more-than-one-instance) if you need that for agentic testing.

### 4. Setting up the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file in this directory:
   ```env
   VITE_FRONTEND_API_ENDPOINT=http://localhost:8080
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

> 💡 **Tip**: `pnpm dev` will automatically rebuild when you make changes to the code

Now you're all set to start developing! Happy coding! 🎉

## Verifying Your Setup
To verify everything is working correctly:

1. **Check ClickHouse**: `curl http://localhost:8123/ping` (should return "Ok.")
2. **Check OTel Collector**: `curl http://localhost:13133` (should return health status)
3. **Check Backend**: `curl http://localhost:8080/api/v1/health` (should return `{"status":"ok"}`)
4. **Check Frontend**: Open `http://localhost:3301` in your browser

## How do I run more than one instance?

Handy when you keep several branches checked out as separate git worktrees. Every port
and path below is read from the environment, so set them on the `make` call:

```bash
SIGNOZ_APISERVER_ADDRESS=0.0.0.0:8081 \
SIGNOZ_SQLSTORE_SQLITE_PATH=/path/to/main/sqlite.db \
SIGNOZ_INSTRUMENTATION_METRICS_READERS_PULL_EXPORTER_PROMETHEUS_PORT=9091 \
make go-run-community
```

| Variable | Default | Why you'd change it |
| --- | --- | --- |
| `SIGNOZ_APISERVER_ADDRESS` | `0.0.0.0:8080` | Address the API server listens on |
| `SIGNOZ_SQLSTORE_SQLITE_PATH` | `signoz.db` in worktree | To reuse same database |
| `SIGNOZ_INSTRUMENTATION_METRICS_READERS_PULL_EXPORTER_PROMETHEUS_PORT` | `9090` | Bound by the Prometheus metrics exporter on startup |

Point the frontend at whichever backend you want, in `frontend/.env`:

```env
VITE_FRONTEND_API_ENDPOINT=http://localhost:8081
```

Stop an instance using the address it was started on:

```bash
make go-stop SIGNOZ_APISERVER_ADDRESS=0.0.0.0:8081
```

## How to send test data?

You can now send telemetry data to your local SigNoz instance:

- **OTLP gRPC**: `localhost:4317`
- **OTLP HTTP**: `localhost:4318`

For example, using `curl` to send a test trace:
```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"test-service"}}]},"scopeSpans":[{"spans":[{"traceId":"12345678901234567890123456789012","spanId":"1234567890123456","name":"test-span","startTimeUnixNano":"1609459200000000000","endTimeUnixNano":"1609459201000000000"}]}]}]}'
```
