# Reliability Agent — Phase 1

Phase 1 establishes the user-defined telemetry contract and a generic,
profile-driven audit engine. It is designed to support ordinary backends,
workers, and AI agents without applying irrelevant rules.

## Run

```text
go run ./cmd/reliability-agent --profile examples/checkout-api.yaml
```

Run a live SLO evaluation against SigNoz:

```text
SIGNOZ_URL=http://localhost:8080 \
SIGNOZ_API_KEY="<service-account-key>" \
go run ./cmd/reliability-agent slo \
  --config examples/checkout-slo.yaml \
  --output json
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
POST /v1/slo/evaluate
```

`POST /v1/audit` accepts a normalized evidence snapshot. The SigNoz source
adapter and live query path will be added before Phase 1 is considered
complete.

Phase 2 adds SLO-as-code evaluation through `POST /v1/slo/evaluate`. The SLO
engine reuses the pure evaluator, state, budget, burn-rate, and scalar-query
patterns from PR #2 while requiring service/environment-scoped dependencies.

The `slo` command uses the same live SigNoz client as the HTTP API and reads
scalar results from `/api/v5/query_range`. A partial or empty response remains
`indeterminate` rather than becoming a zero or a healthy result.

## Phase 1 boundaries

- The profile determines which fields and rules apply.
- `not_applicable` is used for rules that are not part of a profile.
- Missing data is a failure only when the query is complete.
- Partial or unavailable data produces `indeterminate`.
- The audit report contains no SLO result.
