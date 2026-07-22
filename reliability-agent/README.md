# Reliability Agent — Phase 1

Phase 1 establishes the user-defined telemetry contract and a generic,
profile-driven audit engine. It is designed to support ordinary backends,
workers, and AI agents without applying irrelevant rules.

## Run

```text
go run ./cmd/reliability-agent --profile examples/checkout-api.yaml
```

The Phase 1 HTTP API provides:

```text
GET  /healthz
GET  /v1/profiles
GET  /v1/profiles/{name}
POST /v1/profiles
POST /v1/profiles/{name}/validate
POST /v1/profiles/{name}/activate
POST /v1/audit
```

`POST /v1/audit` accepts a normalized evidence snapshot. The SigNoz source
adapter and live query path will be added before Phase 1 is considered
complete.

## Phase 1 boundaries

- The profile determines which fields and rules apply.
- `not_applicable` is used for rules that are not part of a profile.
- Missing data is a failure only when the query is complete.
- Partial or unavailable data produces `indeterminate`.
- The audit report contains no SLO result.
