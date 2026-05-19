# Hanzo o11y — ZAP Schema (HIP-0106)
#
# Server: hanzoai/o11y mounted at /v1/o11y inside the unified cloud binary.
# Metrics, traces, logs, dashboards, alerts, rule evaluation, opamp.
#
# Code generation:
#   zapc generate o11y.zap --lang go --out ./pkg/o11y/zap/
#   zapc generate o11y.zap --lang ts --out ./frontend/src/zap/
#   zapc generate o11y.zap --lang py --out ./py/zap/
#   zapc generate o11y.zap --lang rust --out ./rust/src/zap/

# ── Telemetry primitives ────────────────────────────────────────────────

struct Counter
  name  Text
  tags  List(Text)
  value Int64

struct Timing
  name    Text
  tags    List(Text)
  seconds Float64

struct Span
  name      Text
  traceId   Text
  spanId    Text
  parentId  Text
  startUnix Int64
  endUnix   Int64
  attrs     Text          # OTLP attributes, JSON-encoded

# ── Query interface ─────────────────────────────────────────────────────

struct QueryRequest
  query      Text
  start      Int64
  end        Int64
  step       Int64
  variables  Text          # JSON-encoded template variables

struct QueryResult
  series      List(Series)
  scalar      Float64
  string      Text
  type        Text          # "matrix" | "vector" | "scalar" | "string"

struct Series
  labels      Text          # JSON-encoded label set
  samples     List(Sample)

struct Sample
  timestamp   Int64
  value       Float64

# ── Health ──────────────────────────────────────────────────────────────

struct Health
  status   Text
  version  Text

# ── Service interface ───────────────────────────────────────────────────

interface O11y
  # Emit telemetry — the canonical write path.
  emitCounter (counter Counter) -> ()
  emitTiming  (timing Timing)   -> ()
  emitSpan    (span Span)       -> ()

  # Query — PromQL / metrics expression evaluator.
  query (request QueryRequest) -> (result QueryResult)

  # Health probe.
  health () -> (status Health)
