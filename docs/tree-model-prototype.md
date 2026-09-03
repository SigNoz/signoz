# Tree-model prototype (proto/tree-model)

A local prototype of the proposed end-state architecture, built on
`feat/semconv-phase2-signals` with byte-parity as the acceptance bar: every
golden and every integration case must produce identical SQL. The prototype
exists to let a reviewer judge the model empirically — how small the generic
core really is, how large the per-signal residue really is, and where the
line between them falls.

## What became generic

### The term compiler — `pkg/querybuilder/term.go`

`CompileTerm` is the flow of one filter term, written once:

1. resolve the evidence (`ResolveLogicalFields`, ambiguity warning),
2. amend it with intrinsic storage (`TermSchema.AmendEvidence`),
3. synthesize when it is empty (`TermSchema.Synthesize`),
4. apply the resource-filter policy (`SkipResourcePolicy`),
5. compile every field (`TermSchema.CompileField`), collecting warnings in
   a fixed order.

Six condition builders became delegates to it: traces, logs, metrics, audit,
rule state history, and the resource filter. Each keeps a term-level
intercept in front where one exists (`search()` on logs, the function-operator
reject or skip), and implements the three `TermSchema` methods. The six
hand-rolled copies of the flow are gone; a change to the flow — the order of
warnings, the synthesized-exemption of the resource drop — now has one home.

`CompileFieldWithSharedOperators` is the canonical `CompileField`: the shared
operator switch (`LogicalFamilyCondition`) over the merged or single value
expression, with the default exists guard for positive operators. Traces uses
it for every field; logs and metrics use it for families.

### The coerced column renderer — `pkg/querybuilder/column.go`

`RenderCoercedColumn` renders resolved fields for group-by, order, and
aggregation arguments: every field exists-guarded and coerced in one
`multiIf`, with the NULL group preserved. Traces and logs delegate their
coerced modes to it through three leaf questions (`ColumnSchema`):

- `RawRead` — the uncoerced read of one field (logs overrides the legacy
  body path),
- `Uncoerced` — the coercion exemption (traces time columns, logs legacy
  body reads),
- `BareCandidate` — the fields that cannot sit inside `multiIf` (arrays).

## What stayed per-signal, and why

- **The single-key operator switches.** Metrics coerces collisions with its
  own casts (`toFloat64OrNull`, labels-as-String), logs carries the body
  machinery and the body-column index forms, audit and rule state history
  have their own switches. Unifying them changes SQL, so byte-parity forbids
  it here. This is the real distance to "one operator switch": it exists for
  families today, and extending it to singles is a re-pinning exercise, not a
  refactor.
- **The resource-filter compile.** Index hints are woven into every operator
  case with per-operator polarity rules; the whole field compile stays its
  own (`CompileField` overrides wholesale).
- **The raw-select tails.** Traces and logs raw-select shapes differ in more
  dimensions than they share (guard tests, stringification, collision
  application), so `ColumnExpressionFor`'s Unspecified mode keeps its
  per-signal tails. A generic raw renderer would need more knobs than it
  removes lines.
- **The column resolution orders.** Which candidates a column stage sees —
  the storage probe, the metadata lookups, the swap/append of resolved
  spellings — keeps its pinned per-signal order in the mappers. Moving it
  into a generic `Resolve` is the model-B step proper, and it needs the
  stage-aware synthesis asymmetry (filters synthesize by operand, columns
  do not) carried as data.
- **Metadata.** Its merged-value semantics bind query parameters inside
  presence guards, which the arg-free `ExistsFor` contract cannot express.
  Untouched, as declared.

## The review round (applied)

- The rule-state-history operator forms are pinned in the commit BEFORE the
  port (it had no tests and diverges most: IN binds the whole list to one
  placeholder, exists renders two ways), so the port proves parity.
- Audit refuses families in its delegate, before the resource drop, so the
  wiring tripwire stays loud instead of dropping a resource-context family
  silently.
- The logs coerced-column schema value carries the body mode; the flag reads
  one time per call. RawRead's dummy-value parameter is a legacy-body shim
  and leaves with the legacy body.
- The compile context is named `CompileScope`: "scope" alone collides with
  the span search scope, the vocabulary member scope, and the resolution
  scope.

## Findings a reviewer should weigh

1. The condition-side consolidation is real and cheap: six flows became one,
   with per-signal surface of exactly three methods each, and every golden
   stayed byte-identical without adjustment.
2. The column side splits: coerced modes unify on three knobs; raw select
   does not pay for unification at today's shapes.
3. The full tree model (candidates as data, one `Resolve`, generic raw
   rendering) requires shape reconciliation that byte-parity forbids —
   confirming it should ride a forcing feature (the ValueMap reader) with a
   re-pinning round, not a standalone refactor.
