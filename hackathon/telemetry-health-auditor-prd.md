# PRD: Inbuilt Telemetry Health Auditor

Status: Draft (design only, no implementation in this PR)
Owner: NarayanaSabari
Target: `guruvedhanth-s/signoz` fork (hackathon)
Repo base for file links: `https://github.com/guruvedhanth-s/signoz/blob/main`

---

## 1. Executive summary

This project adds a native reliability layer inside SigNoz that grades the quality of the telemetry SigNoz itself ingests.

Today SigNoz stores, queries, visualizes, and alerts on logs, metrics, and traces.
It does not tell you whether that telemetry is complete, correct, affordable, or trustworthy.
Teams routinely build dashboards and alerts on top of telemetry that is missing `service.name`, has broken trace parent-child links, ships unmapped LLM models, or emits unbounded-cardinality metric labels.
When the underlying data is wrong, every dashboard and SLO built on it is quietly wrong too.

The Telemetry Health Auditor is a new SigNoz module that inspects the telemetry metadata already stored in ClickHouse, runs a deterministic set of quality checks, produces a health score with actionable findings, and emits that score back into SigNoz as a first-class metric.
An optional LLM feedback layer turns each structured finding into human-readable guidance and a suggested instrumentation fix, without ever influencing the numeric score.

The core insight is that this is not a rebuild.
SigNoz already exposes a `MetadataStore` interface that can enumerate every attribute key, list distinct values, report last-seen timestamps, and fetch metric temporality and type.
The auditor composes those existing primitives into a scoring engine.
That inversion (a small amount of new logic on top of a large amount of existing plumbing) is what makes this feasible as a hackathon deliverable.

---

## 2. Problem statement

Observability decisions are only as good as the telemetry behind them.

1. Can we trust the telemetry being ingested into SigNoz?
2. Is the developer emitting logs and metrics that are complete, correctly typed, cost-controlled, and queryable?

Traditional observability answers "did the request fail" and "how slow was it".
It does not answer "is my instrumentation good enough to be believed".
This gap is worse for AI agents, where a request can return HTTP 200 with no exception while still producing an ungrounded answer, a missing model attribute, or an unmapped pricing model that silently breaks cost tracking.

The auditor closes this gap by continuously grading telemetry quality and coaching the developer on how to improve it.

### Related open SigNoz issues this validates

| Issue | Relationship |
|---|---|
| [#11666 Telemetry data quality checker](https://github.com/SigNoz/signoz/issues/11666) | Direct validation for the auditor concept. |
| [#4654 High-cardinality span names](https://github.com/SigNoz/signoz/issues/4654) | Backs the cardinality checks. |
| [#8715 Inactive services](https://github.com/SigNoz/signoz/issues/8715) | Backs the stale-service check. |
| [#5230 Ingested data visibility and control](https://github.com/SigNoz/signoz/issues/5230) | Backs the ingestion inventory view. |
| [#2064 Cost control of observability data](https://github.com/SigNoz/signoz/issues/2064) | Backs the cardinality and cost findings. |

---

## 3. Goals and non-goals

### Goals

1. Provide a deterministic, reproducible telemetry health score per service and per signal.
2. Run at least 5 quality checks against real telemetry using existing SigNoz storage primitives.
3. Emit the score and finding counts back into SigNoz as metrics so they render on a normal dashboard.
4. Ship a dedicated in-product page that shows the score, the findings, the affected telemetry, and a recommended fix.
5. Use an LLM only to phrase developer feedback, never to compute the score.

### Non-goals

1. Rebuilding ingestion, storage, dashboards, alerting, or LLM tracing that SigNoz already provides.
2. Applying destructive remediation automatically. Recommendations are read-only in the MVP.
3. Depending on SigNoz Cloud only features such as Noz. The auditor must work on a self-hosted stack.
4. Full SLO or error-budget engine. That is explicitly future work (see Phase 3).

---

## 4. Personas and user stories

Persona: Application developer instrumenting a service or AI agent.

- As a developer, I want a single score that tells me if my telemetry is good, so I know whether my dashboards can be trusted.
- As a developer, I want each problem to link to the exact traces or metrics affected, so I can reproduce it.
- As a developer, I want a copy-pasteable fix for each finding, so I can improve my instrumentation quickly.

Persona: Platform or SRE owner enforcing telemetry standards.

- As a platform owner, I want an org-wide health score trend, so I can gate teams before their dashboards reach production.
- As a platform owner, I want the score as a metric, so I can alert when quality regresses.

---

## 5. Scope

### MVP (this hackathon)

- Backend module `telemetryhealth` exposing `GET /api/v1/telemetry-health`.
- Five checks: `missing_service_name`, `missing_model_name`, `missing_token_usage`, `high_cardinality_attribute`, `stale_service`.
- Deterministic weighted score.
- Score emitted back as OTLP metrics.
- One frontend page with score, findings table, and per-finding fix text.
- Deterministic broken-then-fixed demo dataset that moves the score from roughly 48 to 94.

### Phase 2 (stretch)

- LLM feedback layer generating prose and SDK snippets per finding.
- More checks: trace parent-child integrity, missing error status, counter/gauge misuse, missing severity on logs, trace-log correlation.
- Per-signal breakdown and historical score trend panel.

### Phase 3 (future, out of scope for the PR)

- SLO and error-budget engine with a `healthy` / `unhealthy` / `indeterminate` state, where incomplete telemetry forces `indeterminate` instead of a false pass.
- Generated dashboards and burn-rate alerts.
- Human-approved remediation pull requests.

---

## 6. Architecture

### 6.1 System context

```mermaid
flowchart TD
    subgraph app[Instrumented apps and AI agents]
        SDK[OpenTelemetry SDK]
    end
    SDK -->|OTLP| COL[SigNoz OTel Collector]
    COL --> CH[(ClickHouse - telemetry)]

    subgraph signoz[SigNoz backend]
        QS[query-service HTTP router]
        META[MetadataStore]
        AUD[telemetryhealth module NEW]
        QS --> AUD
        AUD --> META
        META --> CH
        AUD -->|emit score via OTLP| COL
    end

    subgraph fe[SigNoz frontend]
        PAGE[Telemetry Health page NEW]
    end
    PAGE -->|GET /api/v1/telemetry-health| QS
    QS -->|JSON score + findings| PAGE
    AUD -.optional prose.-> LLM[LLM feedback provider]
```

### 6.2 Where the new module sits inside SigNoz

```mermaid
flowchart LR
    subgraph existing[Existing SigNoz primitives reused as-is]
        MS[MetadataStore\nGetKeys / GetAllValues\nFetchLastSeenInfoMulti\nFetchTemporalityAndTypeMulti]
        PR[llmpricingrule store]
        TS[telemetrystore ClickHouse]
        MS --> TS
    end

    subgraph new[New code in this project]
        IFACE[telemetryhealth.Module + Handler interface]
        IMPL[impltelemetryhealth\nmodule.go / handler.go]
        CHECKS[check registry\n5 rule funcs]
        SCORE[deterministic scorer]
        IMPL --> CHECKS --> SCORE
        IMPL --> IFACE
    end

    IMPL --> MS
    IMPL --> PR
    REG[signoz module.go / handler.go\nrouter registration] --> IMPL
```

### 6.3 Request and scoring flow

```mermaid
sequenceDiagram
    participant FE as Frontend page
    participant R as query-service router
    participant H as telemetryhealth Handler
    participant M as telemetryhealth Module
    participant CR as Check registry
    participant MS as MetadataStore
    participant COL as OTel Collector

    FE->>R: GET /api/v1/telemetry-health?service=X&window=24h
    R->>H: ViewAccess(GetHealth)
    H->>M: Audit(orgID, service, window)
    loop each check
        M->>CR: run check
        CR->>MS: GetKeys / GetAllValues / FetchLastSeen / FetchTemporality
        MS-->>CR: metadata
        CR-->>M: finding(pass/fail, count, severity)
    end
    M->>M: score = weighted(findings)
    M-->>COL: emit telemetry.quality.* metrics (OTLP)
    M-->>H: {score, findings[]}
    H-->>FE: JSON
    FE->>FE: render dial + findings table
```

### 6.4 Scoring pipeline

```mermaid
flowchart LR
    F[findings list] --> W{per severity weight}
    W -->|critical -15| S[base 100]
    W -->|warning -5| S
    W -->|info -1| S
    S --> C[clamp 0..100]
    C --> OUT[health score]
    F --> CNT[counts by severity]
    OUT --> EMIT[emit as metric]
    CNT --> EMIT
```

---

## 7. Check catalog (MVP)

Every check is backed by an existing method on the `MetadataStore` interface defined in
[`pkg/types/telemetrytypes/store.go`](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/types/telemetrytypes/store.go).
No new ClickHouse SQL is required for the MVP.

| Check id | Severity | What it detects | Backing primitive |
|---|---|---|---|
| `missing_service_name` | critical | Spans or metrics without `service.name` on the resource | `GetKeys()` then confirm presence of the `service.name` key |
| `missing_model_name` | critical | LLM spans without `gen_ai.request.model` | `GetKeys()` filtered to gen_ai keys |
| `missing_token_usage` | warning | LLM spans without `gen_ai.usage.input_tokens` / `output_tokens` | `GetKeys()` filtered to token keys |
| `high_cardinality_attribute` | warning | Attributes whose distinct value count exceeds a threshold | `GetAllValues()` and count via `NumValues()` |
| `stale_service` | warning | Services or metrics with no data past a staleness window | `FetchLastSeenInfoMulti()` |

Phase 2 candidate checks and their backing primitive:

| Check id | Backing primitive |
|---|---|
| `counter_gauge_misuse` | `FetchTemporalityAndTypeMulti()` |
| `unmapped_llm_model` | `GetAllValues()` on model attr cross-referenced with the llmpricingrule store in [`pkg/types/llmpricingruletypes`](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/types/llmpricingruletypes) |
| `broken_trace_context` | querier over the traces table (parent span id resolution) |

---

## 8. Deterministic scoring model

The score must be reproducible: identical telemetry in produces an identical score out.
The LLM never touches this computation.

```text
score = clamp(100
              - 15 * count(critical)
              -  5 * count(warning)
              -  1 * count(info),
              0, 100)
```

Each finding has a stable shape:

```json
{
  "rule": "missing_service_name",
  "severity": "critical",
  "affected_signal": "traces",
  "affected_count": 18,
  "sample_query": "https://<signoz-host>/traces-explorer?...",
  "recommendation": "Set service.name in the OpenTelemetry Resource."
}
```

Response envelope:

```json
{
  "score": 48,
  "counts": { "critical": 1, "warning": 3, "info": 2 },
  "window": "24h",
  "service": "support-agent",
  "findings": [ /* array of finding objects */ ]
}
```

---

## 9. Emitted metrics schema

The auditor emits its own results back into SigNoz via OTLP so they render on a normal dashboard and can be alerted on.

| Metric | Type | Labels |
|---|---|---|
| `telemetry.quality.score` | gauge | `service`, `org` |
| `telemetry.quality.findings` | gauge | `service`, `severity` |
| `telemetry.quality.critical_findings` | gauge | `service` |
| `telemetry.quality.high_cardinality_series` | gauge | `service`, `attribute` |
| `telemetry.quality.unmapped_models` | gauge | `service` |

---

## 10. API contract

`GET /api/v1/telemetry-health`

Query params:

- `service` optional, scopes to one service, otherwise all services in the org.
- `window` optional, defaults to `24h`, bounds every underlying query.
- `signal` optional, one of `traces` / `metrics` / `logs`.

Auth: `ViewAccess` middleware, matching the pattern already used for
[`/api/v1/orgs/me/filters`](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/query-service/app/http_handler.go#L551).

All queries are time-bounded and row-limited to keep the auditor cheap and safe.

---

## 11. Backend module design

Follow the existing SigNoz module pattern used by `quickfilter`.

Interface package `pkg/modules/telemetryhealth/telemetryhealth.go`:

```go
package telemetryhealth

type Module interface {
    Audit(ctx context.Context, orgID valuer.UUID, params AuditParams) (*Report, error)
}

type Handler interface {
    GetHealth(http.ResponseWriter, *http.Request)
}
```

Implementation package `pkg/modules/telemetryhealth/impltelemetryhealth/`:

- `module.go` orchestrates the check registry and computes the score.
- `handler.go` parses params, calls the module, writes JSON.
- `checks.go` holds the 5 check functions, each taking `MetadataStore` and returning a `Finding`.
- `emitter.go` pushes `telemetry.quality.*` metrics via OTLP.

Types live in a new `pkg/types/telemetryhealthtypes/` package (`report.go`, `finding.go`, `severity.go`) to match the repo convention of one types package per domain.

---

## 12. Frontend design

A single new page rendered inside the existing app shell.

- Route added to [`frontend/src/AppRoutes/routes.ts`](https://github.com/guruvedhanth-s/signoz/blob/main/frontend/src/AppRoutes/routes.ts) and path constant to [`frontend/src/constants/routes.ts`](https://github.com/guruvedhanth-s/signoz/blob/main/frontend/src/constants/routes.ts).
- Page component under `frontend/src/pages/TelemetryHealth/`.
- Container with the data fetching hook under `frontend/src/container/TelemetryHealth/`.
- Data fetched via a react-query hook calling `GET /api/v1/telemetry-health`.

Layout: a score dial at the top, a severity summary row, and a findings table.
Each findings row shows severity, affected signal, affected count, recommendation text, and a link to the relevant traces or metrics explorer query.
CSS Modules per the frontend conventions in [`frontend/CLAUDE.md`](https://github.com/guruvedhanth-s/signoz/blob/main/frontend/CLAUDE.md).

---

## 13. LLM feedback layer (Phase 2, bounded)

The LLM is a presentation layer only.

- Input: a structured `Finding`.
- Output: a friendly explanation plus a suggested SDK snippet.
- It never returns or alters the numeric score.
- It is optional and the page works fully without it.

This mirrors how SigNoz itself separates its deterministic query engine from the Noz AI layer.

---

## 14. Files to change

New files are marked NEW.
Existing files that need edits link to the current version on the fork.

### Backend

| File | URL | Change |
|---|---|---|
| `pkg/modules/telemetryhealth/telemetryhealth.go` | NEW | Module + Handler interface. |
| `pkg/modules/telemetryhealth/impltelemetryhealth/module.go` | NEW | Orchestrate checks, compute score. |
| `pkg/modules/telemetryhealth/impltelemetryhealth/handler.go` | NEW | HTTP handler, parse params, write JSON. |
| `pkg/modules/telemetryhealth/impltelemetryhealth/checks.go` | NEW | The 5 check functions. |
| `pkg/modules/telemetryhealth/impltelemetryhealth/emitter.go` | NEW | Emit `telemetry.quality.*` metrics via OTLP. |
| `pkg/types/telemetryhealthtypes/report.go` | NEW | `Report`, `AuditParams`. |
| `pkg/types/telemetryhealthtypes/finding.go` | NEW | `Finding` shape. |
| `pkg/types/telemetryhealthtypes/severity.go` | NEW | Severity enum and weights. |
| `pkg/signoz/module.go` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/signoz/module.go) | Add `TelemetryHealth` to `Modules` struct and construct it in `NewModules`. |
| `pkg/signoz/handler.go` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/signoz/handler.go) | Add `TelemetryHealth` to `Handlers` and wire in `NewHandlers`. |
| `pkg/query-service/app/http_handler.go` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/query-service/app/http_handler.go) | Register `router.HandleFunc("/api/v1/telemetry-health", am.ViewAccess(aH.Signoz.Handlers.TelemetryHealth.GetHealth))`. |

Reused without modification (referenced for implementation):

| File | URL | Why |
|---|---|---|
| `pkg/types/telemetrytypes/store.go` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/types/telemetrytypes/store.go) | `MetadataStore` interface backing every check. |
| `pkg/telemetrymetadata/metadata.go` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/telemetrymetadata/metadata.go) | Concrete metadata store implementation. |
| `pkg/types/llmpricingruletypes` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/types/llmpricingruletypes) | Pricing rules for the unmapped-model check. |
| `pkg/modules/quickfilter/quickfilter.go` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/pkg/modules/quickfilter/quickfilter.go) | Reference module pattern to copy. |

### Frontend

| File | URL | Change |
|---|---|---|
| `frontend/src/pages/TelemetryHealth/index.tsx` | NEW | Page component. |
| `frontend/src/pages/TelemetryHealth/TelemetryHealth.module.scss` | NEW | Page styles (CSS Modules). |
| `frontend/src/container/TelemetryHealth/index.tsx` | NEW | Container, renders dial + table. |
| `frontend/src/container/TelemetryHealth/useTelemetryHealth.ts` | NEW | react-query fetch hook. |
| `frontend/src/api/telemetryHealth/getHealth.ts` | NEW | API call. |
| `frontend/src/types/api/telemetryHealth/index.ts` | NEW | Response types. |
| `frontend/src/AppRoutes/routes.ts` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/frontend/src/AppRoutes/routes.ts) | Add the route entry. |
| `frontend/src/AppRoutes/pageComponents.ts` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/frontend/src/AppRoutes/pageComponents.ts) | Lazy import the page. |
| `frontend/src/constants/routes.ts` | [link](https://github.com/guruvedhanth-s/signoz/blob/main/frontend/src/constants/routes.ts) | Add path constant. |

---

## 15. Test plan

Backend:

- Unit test each of the 5 check functions against a mocked `MetadataStore` (repo already provides store test harnesses).
- Cover four cases per check: healthy, failing, missing-data, partial-data.
- Unit test the scorer for weight math and clamping.
- Table test the handler for param parsing and the JSON envelope.

Frontend:

- Component test the findings table and score dial using `data-testid` per the frontend conventions.
- Mock the react-query hook.

Integration:

- Run the auditor against the deterministic demo dataset and assert the score is roughly 48 before fixes and roughly 94 after.
- Assert applying the same audit twice does not create duplicate emitted metric series.

---

## 16. Demo script (5 minutes)

```text
1. Show an AI-agent trace that looks healthy (HTTP 200, no error).
2. Open the Telemetry Health page. Score is about 48/100.
3. Point out: 18 spans missing service.name, model name absent, request.id high cardinality.
4. Show that the score is also a metric panel on a normal SigNoz dashboard.
5. Apply the instrumentation fixes from the recommendations.
6. Re-run the auditor. Score climbs to about 94/100.
7. Close with the one-line pitch below.
```

Pitch:

> SigNoz can now grade its own telemetry and tell developers exactly which spans are lying to them, as a page inside SigNoz.

---

## 17. Judging criteria mapping

| Criterion | How this project scores |
|---|---|
| Potential Impact | Prevents teams trusting dashboards and SLOs built on broken telemetry. |
| Creativity | A product that audits the trustworthiness of its own data, not another dashboard. |
| Technical Excellence | Deterministic scoring, typed config, bounded queries, unit + integration tests, idempotent metric emission. |
| Best Use of SigNoz | Built inside SigNoz as a module and a page, reusing MetadataStore, querier, and pricing rules, emitting results back as metrics. |
| User Experience | One page, one score, actionable findings with copy-pasteable fixes and deep links. |
| Presentation | Deterministic before/after demo with a visible score jump. |

---

## 18. Risks and mitigations

| Risk | Mitigation |
|---|---|
| DI and module wiring onboarding cost | Copy the `quickfilter` module verbatim as a scaffold. Get an empty route returning JSON on day one. |
| Heavy local stack (ClickHouse + collector + sqlite + builds) | Stand up the dev stack first, verify a rebuild-and-see-route loop before writing checks. |
| LLM contaminating the score | Score is deterministic and rule-based. LLM is prose-only and optional. |
| Flaky live demo | Drive the demo from a deterministic replayable dataset, not live ingestion. |
| Programmatic alert creation bugs upstream (`#10823`, `#10881`) | Out of MVP scope. Score is emitted as a metric and alerted with a simple threshold, avoiding formula-alert bugs. |
| Name clash with existing `pkg/telemetryaudit` (the audit-log signal) | Use the distinct name `telemetryhealth` everywhere. |

---

## 19. Open questions

1. Should the score be per-service, per-signal, or a single org-level roll-up for the demo?
2. Which LLM provider do we wire for the Phase 2 feedback prose, and is a key available in the demo environment?
3. Do we want the page in the main side nav for the demo, or reachable by direct URL only?
