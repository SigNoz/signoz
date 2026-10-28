# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SigNoz is an open-source observability platform (APM, logs, metrics, traces) built on OpenTelemetry and ClickHouse. It provides a unified solution for monitoring applications with features including distributed tracing, log management, metrics dashboards, and alerting.

## Build and Development Commands

### Development Environment Setup
```bash
make devenv-up              # Start ClickHouse and OTel Collector for local dev
make devenv-clickhouse      # Start only ClickHouse
make devenv-signoz-otel-collector  # Start only OTel Collector
make devenv-clickhouse-clean       # Clean ClickHouse data
```

### Backend (Go)
```bash
make go-run-community       # Run community backend server
make go-run-enterprise      # Run enterprise backend server
make go-test                # Run all Go unit tests
go test -race ./pkg/...     # Run tests for specific package
go test -race ./pkg/querier/...  # Example: run querier tests
```

### Integration Tests (Python)
```bash
cd tests/integration
uv sync                     # Install dependencies
make py-test-setup          # Start test environment (keep running with --reuse)
make py-test                # Run all integration tests
make py-test-teardown       # Stop test environment

# Run specific test
uv run pytest --basetemp=./tmp/ -vv --reuse src/<suite>/<file>.py::test_name
```

### Code Quality
```bash
# Go linting (golangci-lint)
golangci-lint run

# Python formatting/linting
make py-fmt                 # Format with black
make py-lint                # Run isort, autoflake, pylint
```

### OpenAPI Generation
```bash
go run cmd/enterprise/*.go generate openapi
```

## Architecture Overview

### Backend Structure

The Go backend follows a **provider pattern** for dependency injection:

- **`pkg/signoz/`** - IoC container that wires all providers together
- **`pkg/modules/`** - Business logic modules (user, organization, dashboard, etc.)
- **`pkg/<provider>/`** - Provider implementations following consistent structure:
  - `<name>.go` - Interface definition
  - `config.go` - Configuration (implements `factory.Config`)
  - `<implname><name>/provider.go` - Implementation
  - `<name>test/` - Mock implementations for testing

### Key Packages
- **`pkg/querier/`** - Query engine for telemetry data (logs, traces, metrics)
- **`pkg/telemetrystore/`** - ClickHouse telemetry storage interface
- **`pkg/sqlstore/`** - Relational database (SQLite/PostgreSQL) for metadata
- **`pkg/apiserver/`** - HTTP API server with OpenAPI integration
- **`pkg/alertmanager/`** - Alert management
- **`pkg/authn/`, `pkg/authz/`** - Authentication and authorization
- **`pkg/flagger/`** - Feature flags (OpenFeature-based)
- **`pkg/errors/`** - Structured error handling

### Enterprise vs Community
- **`cmd/community/`** - Community edition entry point
- **`cmd/enterprise/`** - Enterprise edition entry point
- **`ee/`** - Enterprise-only features

## Code Conventions

### Error Handling
Use the custom `pkg/errors` package instead of standard library:
```go
errors.New(typ, code, message)           // Instead of errors.New()
errors.Newf(typ, code, message, args...) // Instead of fmt.Errorf()
errors.Wrapf(err, typ, code, msg)        // Wrap with context
```

Define domain-specific error codes:
```go
var CodeThingNotFound = errors.MustNewCode("thing_not_found")
```

### HTTP Handlers
Handlers are thin adapters in modules that:
1. Extract auth context from request
2. Decode request body using `binding` package
3. Call module functions
4. Return responses using `render` package

Register routes in `pkg/apiserver/signozapiserver/` with `handler.New()` and `OpenAPIDef`.

### SQL/Database
- Use Bun ORM via `sqlstore.BunDBCtx(ctx)`
- Star schema with `organizations` as central entity
- All tables have `id`, `created_at`, `updated_at`, `org_id` columns
- Write idempotent migrations in `pkg/sqlmigration/`
- No `ON CASCADE` deletes - handle in application logic

### REST Endpoints
- Use plural resource names: `/v1/organizations`, `/v1/users`
- Use `me` for current user/org: `/v1/organizations/me/users`
- Follow RESTful conventions for CRUD operations

### Linting Rules (from .golangci.yml)
- Don't use `errors` package - use `pkg/errors`
- Don't use `zap` logger - use `slog`
- Don't use `fmt.Errorf` or `fmt.Print*`

## Testing

### Unit Tests
- Run with race detector: `go test -race ./...`
- Provider mocks are in `<provider>test/` packages

### Integration Tests
- Located in `tests/integration/`
- Use pytest with testcontainers
- Files prefixed with numbers for execution order (e.g., `01_database.py`)
- Always use `--reuse` flag during development
- Fixtures in `tests/integration/fixtures/`
