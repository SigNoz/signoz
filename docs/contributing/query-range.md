# Query Range v5 — Design Principles & Architectural Contracts

## Purpose of This Document

This document defines the design principles, invariants, and architectural contracts of the Query Range v5 system. It is intended for the authors working on the querier and querier related parts codebase. Any change to the system must align with the principles described here. If a change would violate a principle, it must be flagged and discussed.

---

## Core Architectural Principle

**The user speaks OpenTelemetry. The storage speaks ClickHouse. The system translates between them. These two worlds must never leak into each other.**

Every design choice in Query Range flows from this separation. The user-facing API surface deals exclusively in `TelemetryFieldKey`: a representation of fields as they exist in the OpenTelemetry data model. The storage layer deals in ClickHouse column expressions, table names, and SQL fragments. The translation between them is mediated by a small set of composable abstractions with strict boundaries.

---

## The Central Type: `TelemetryFieldKey`

`TelemetryFieldKey` is the atomic unit of the entire query system. Every filter, aggregation, group-by, order-by, and select operation is expressed in terms of field keys. Understanding its design contracts is non-negotiable.

### Identity

A field key is identified by three dimensions:

- **Name** — the field name as the user knows it (`service.name`, `http.method`, `trace_id`)
- **FieldContext** — where the field lives in the OTel model (`resource`, `attribute`, `span`, `log`, `body`, `scope`, `event`, `metric`)
- **FieldDataType** — the data type (`string`, `bool`, `number`/`float64`/`int64`, array variants)

### Invariant: Same name does not mean same field

`status` as an attribute, `status` as a body JSON key, and `status` as a span-level field are **three different fields**. The context disambiguates. Code that resolves or compares field keys must always consider all three dimensions, never just the name.

### Invariant: Normalization happens once, at the boundary

`TelemetryFieldKey.Normalize()` is called during JSON unmarshaling. After normalization, the text representation `resource.service.name:string` and the programmatic construction `{Name: "service.name", FieldContext: Resource, FieldDataType: String}` are identical.

**Consequence:** Downstream code must never re-parse or re-normalize field keys. If you find yourself splitting on `.` or `:` deep in the pipeline, something is wrong — the normalization should have already happened.

### Invariant: The text format is `context.name:datatype`

Parsing rules (implemented in `GetFieldKeyFromKeyText` and `Normalize`):

1. Data type is extracted from the right, after the last `:`.
2. Field context is extracted from the left, before the first `.`, if it matches a known context prefix.
3. Everything remaining is the name.

Special case: `log.body.X` normalizes to `{FieldContext: body, Name: X}` — the `log.body.` prefix collapses because body fields under log are a nested context.

### Invariant: Historical aliases must be preserved

The `fieldContexts` map includes aliases (`tag` -> `attribute`, `spanfield` -> `span`, `logfield` -> `log`). These exist because older database entries use these names. Removing or changing these aliases will break existing saved queries and dashboard configurations.

---

## The Abstraction Stack

The query pipeline has three layers. The generic layer is written one time, in `pkg/querybuilder`. A storage is written one time per signal. The statement builders compose them. Each layer depends only on the layer below it. This layering is intentional and must be preserved.

```
StatementBuilder                <- Composes one query into executable SQL
  ├── AggExprRewriter           <- Rewrites aggregation expressions through the generic layer
  ├── filter visitor            <- Parses the filter expression and compiles it one term at a time
  └── querybuilder (generic)    <- Resolution, the condition builder, the column expression builder
        └── Storage             <- What one signal's tables can answer about one field key
```

### Storage

**Contract:** `qbtypes.Storage` in `pkg/types/querybuildertypes/querybuildertypesv5/qb.go`. One implementation per signal: traces, logs, metrics, audit, rule state history, the resource fingerprint sub-query, and the related-values metadata.

A storage answers five questions and nothing else:

- `Read(field)`: the bare SQL read of one field key. No alias, no guard, no cast. It honors the materialization and the evolutions the field carries.
- `Exists(field, exists)`: the presence test of one field key, and how the field reads when a row lacks it (`Absent`, below).
- `Fallback(key, operator, value)`: the field keys that could hold a key metadata does not report: column aliases, the type variants of a map read, body paths, and virtual keys that compile to structural predicates (a span search scope, a full-text search over a scope).
- `Traits()`: the storage's part in the resource fingerprint split, whether it supports body functions, what it does with an unknown key, and which contexts mean "this signal's own record".
- `Compile` and `ColumnRead`: two overrides for a storage with its own condition language (the body JSON language in logs, the index hints of the resource fingerprint, the polarity form of the related values, the String-typed labels of metrics). Every other storage returns `querybuilder.SharedCondition` and `querybuilder.DefaultRead`.

**Principle:** A storage describes its field keys. It never decides a guard, an ambiguity, a warning, or the shape of a fold. Those decisions are derived one time, in the generic layer, from those descriptions.

### Absent

`Exists` returns the field's `Absent`: what a row without the field reads. It is a property of the read, not of the column. `resource.x::String` reads the empty string for an absent row, the multi-era fold `multiIf(..., NULL)` reads NULL, and a table column always reads a real value. Every guard derives from it:

| WhenAbsent | Absent row reads | Positive filter | Raw select | Multi-candidate column | Field keys |
|---|---|---|---|---|---|
| `AlwaysPresent` | a real value | no guard | no guard | no branch, ends the candidate list | table columns |
| `AbsentIsSentinel` | `''`, 0, false, and that is not a value | exists guard | exists guard | presence branch | map attributes, cast JSON paths, string families |
| `AbsentIsNull` | NULL | no guard | no guard | presence branch | multi-era folds, body JSON paths, numeric families |
| `AbsentIsValue` | `''`, and that is the keyless contract | no guard | no guard | no presence branch | metrics labels, rule state history labels |

### The generic layer

`pkg/querybuilder` needs two inputs, made one time per request:

- The metadata keys: `keys := metadataStore.GetKeysMulti(...)`, the field keys the metadata store reports for the query's names, as `map[name][]*TelemetryFieldKey`.
- `q := querybuilder.NewQueryInfo(ctx, orgID, fl, signal, metric, startNs, endNs)`: the org and time range every read needs, the signal and the queried metric that family admission needs, and the query-path flags (`FamiliesOn`, `BodyJSONOn`), evaluated one time.

The functions, from the outside in:

| Function | Does |
|---|---|
| `PrepareWhereClause(query, opts)` | The filter visitor. Parses the filter grammar and compiles each term through `RejectsBodyFunction`, `Resolve`, and `Condition`. Returns the WHERE clause, the warnings, and the cost-guard flag. |
| `NewAggExprRewriter(settings, fullTextColumn, storage, fl, signal)` | Parses an aggregation expression such as `sum(duration_nano)` and resolves each field reference through `ResolveColumn`. |
| `ResolveColumn(ctx, q, storage, key, target, metadata)` | `Resolve` with `FilterOperatorUnknown`, then `Column`. The column stages (raw select, order by, group by, aggregation arguments) call it. |
| `Resolve(ctx, q, storage, key, operator, value, metadata)` | One requested key to its meanings in this storage (see "A resolved key"). |
| `Condition(ctx, q, storage, resolved, dropResourceFields, operator, value, sb)` | A resolved key to the conditions of one filter term: the split narrows the fields, and each field compiles through `storage.Compile`. |
| `Conditions(...)` | `RejectsBodyFunction`, `Resolve`, and `Condition` in one call, for callers outside the visitor: the related-values metadata, the scoped traces predicate resolver, tests. |
| `Column(ctx, q, storage, resolved, target)` | A resolved key to one bare column expression. The caller aliases. |
| `RejectsBodyFunction(traits, operator)` | Before resolution: a storage without body functions (`has`, `hasAny`, `hasAll`, `hasToken`, `search`) errors; the fingerprint side of a split skips the term, because the main query evaluates it. |
| `SharedCondition(...)` | The `Compile` of every storage without its own condition language: `LogicalValueExpr`, the shared data-type collision cast, `OperatorCondition`, then the guard rule. |
| `OperatorCondition(...)` | The operator switch over an already cast read. A storage with its own cast policy composes with it. |
| `DefaultRead(...)` | The `ColumnRead` of every storage without a target-dependent read: `LogicalValueExpr` as an uncoerced column expression. |
| `LogicalValueExpr(...)`, `LogicalExistsExpr(...)` | The only place family expressions are built. A single-member field reads through its member. A family merges the member reads current-first (`COALESCE(NULLIF(m1, ''), NULLIF(m2, ''), '')` for strings, `multiIf` with a NULL tail for numbers) and ORs the member presence tests. A member with a value map reads through `TransformRead`. |

### A resolved key

`Resolve` turns one requested key into a `Resolved` value. It is the only thing the condition builder and the column expression builder receive. Compile it with the operator and value it was resolved with: the stage is the operand, and a nil value means a column or presence use.

```go
type Resolved struct {
	Key          *TelemetryFieldKey // the spelling the request used
	Fields       []*LogicalField    // its meanings in this storage, one per interpretation
	FromFallback bool               // the fields came from the storage's Fallback, not from metadata matches
	Ambiguous    bool               // the matches held several interpretations
	Skipped      bool               // the storage contributes nothing for this key
	Warnings     []string           // the warnings to surface: ambiguity, not-found
}
```

A `LogicalField` is one meaning: one name, context, and data type, backed by one or more physical members. A family (one field with several spellings) is one logical field with several members, current spelling first. Ambiguity (one name, different fields) is several logical fields.

The resolution order is the same for every storage and every stage:

1. **Own context.** A key under one of the storage's own contexts (`span.x`, `log.x`) looks up as if it had no context. Strict contexts (`resource.`, `attribute.`, `scope.`, `body.`) are honored as written.
2. **Matches.** The metadata keys under the key's spellings, grouped into families when the flag is on. Each combination of context and data type is one interpretation.
3. **Ambiguity.** A filter settles several interpretations by resource over attribute, with a warning. A column stage keeps every interpretation in metadata order and folds them, so a select or a group by sees the value wherever it is.
4. **Intrinsic column first**, bare keys only. A column every row has leads the list, whether metadata reports it or the storage's `Fallback` does. Sentinel-reading fields with a contradicting data type drop. A metadata gap degrades to the correct column, never to a corrupt metadata key.
5. **Fallback.** With no match, the storage's fallback keys for the key. When the storage ignores unknown keys (a side query whose main query owns the error), the key is `Skipped`. Otherwise a key nothing can serve is an error with suggestions. The not-found warning fires only when every fallback key is a guess, that is, none of them is always present.

The condition builder then applies the fingerprint split (`MainOfSplit` drops the resource fields the sub-query serves and keeps fallback keys; `FingerprintOfSplit` keeps resource fields only), compiles each field, and the visitor joins the per-field conditions by the operator's polarity. The column expression builder reads each field through `ColumnRead`, casts for the coerced stages unless the read keeps its type, guards by `Absent`, and renders one candidate bare or several as `multiIf(..., NULL)`. A candidate that is not selectable (`ErrNotSelectable`) drops; the error surfaces only when none remains.

### Invariant: No layer skipping

A statement builder must not spell a column or a condition. It calls `ResolveColumn` and the filter visitor. A storage must not decide a guard or an ambiguity. It declares `Absent` and answers the five questions. Skipping layers recreates the per-signal copies the contract removed.

---

## Design Decisions as Constraints

### Constraint: Formula evaluation happens in Go, not in ClickHouse

Formulas (`A + B`, `A / B`, `sqrt(A*A + B*B)`) are evaluated application-side by `FormulaEvaluator`, not via ClickHouse JOINs.

**Why this is a constraint, not just an implementation choice:** The original JOIN-based approach was abandoned because ClickHouse evaluates joins right-to-left, serializing execution unnecessarily. Running queries independently allows parallelism and caching of intermediate results. Any future optimization must not reintroduce the JOIN pattern without solving the serialization problem.

**Consequence:** Individual query results must be independently cacheable. Formula evaluation must handle label matching, timestamp alignment, and missing values without requiring the queries to coordinate at the SQL level.

### Constraint: Zero-defaulting is aggregation-dependent

Only additive/counting aggregations (`count`, `count_distinct`, `sum`, `rate`) default missing values to zero. Statistical aggregations (`avg`, `min`, `max`, percentiles) must show gaps.

**Why:** Absence of data has different meanings. No error requests in a time bucket means error count = 0. No requests at all means average latency is *unknown*, not 0. Conflating these is a correctness bug, not a display preference.

**Enforcement:** `GetQueriesSupportingZeroDefault` determines which queries can default to zero. The `FormulaEvaluator` consumes this via `canDefaultZero`. Changes to aggregation handling must preserve this distinction.

### Constraint: The exists guard derives from the operator and from the field

- **Positive operators** (`=`, `>`, `LIKE`, `IN`, etc.) implicitly assert field existence for a field that reads a sentinel when absent. `http.method = GET` on a map attribute means "the field exists AND equals GET".
- **Negative operators** (`!=`, `NOT IN`, `NOT LIKE`, etc.) never add an existence check. `http.method != GET` includes records where the field doesn't exist at all.
- A field that reads NULL when absent, and a table column, take no guard on any operator: the comparison already excludes the absent row, or there is no absent row.

**Why:** The user's intent with negative operators is ambiguous. Rather than guess, we take the broader interpretation. Users can add an explicit `EXISTS` filter if they want the narrower one. The operator side is declared in `AddDefaultExistsFilter`; the field side is the `Absent` a storage returns from `Exists`.

**Consequence:** Any new operator must declare its existence behavior in `AddDefaultExistsFilter`. Any new read must declare what an absent row reads. Never add a guard by hand in a storage.

### Constraint: Post-processing functions operate on result sets, not in SQL

Functions like `cutOffMin`, `ewma`, `median`, `timeShift`, `fillZero`, `runningDiff`, and `cumulativeSum` are applied in Go on the returned time series, not pushed into ClickHouse SQL.

**Why:** These are sequential time-series transformations that require complete, ordered result sets. Pushing them into SQL would complicate query generation, prevent caching of raw results, and make the functions harder to test. They are applied via `ApplyFunctions` after query execution.

**Consequence:** New time-series transformation functions should follow this pattern i.e implement them as Go functions on `*TimeSeries`, not as SQL modifications.

### Constraint: The API surface rejects unknown fields with suggestions

All request types use custom `UnmarshalJSON` that calls `DisallowUnknownFields`. Unknown fields trigger error messages with Levenshtein-based suggestions ("did you mean: 'groupBy'?").

**Why:** Silent acceptance of unknown fields causes subtle bugs. A misspelled `groupBy` results in ungrouped data with no indication of what went wrong. Failing fast with suggestions turns errors into actionable feedback.

**Consequence:** Any new request type or query spec struct must implement custom unmarshaling with `UnmarshalJSONWithContext`. Do not use default `json.Unmarshal` for user-facing types.

### Constraint: Validation is context-sensitive to request type

What's valid depends on the `RequestType`. For aggregation requests (`time_series`, `scalar`, `distribution`), fields like `groupBy`, `aggregations`, `having`, and aggregation-referenced `orderBy` are validated. For non-aggregation requests (`raw`, `raw_stream`, `trace`), these fields are ignored.

**Why:** A raw log query doesn't have aggregations, so requiring `aggregations` would be wrong. But a time-series query without aggregations is meaningless. The validation rules are request-type-aware to avoid both false positives and false negatives.

**Consequence:** When adding new fields to query specs, consider which request types they apply to and gate validation accordingly.

---

## The Composite Query Model

### Structure

A `QueryRangeRequest` contains a `CompositeQuery` which holds `[]QueryEnvelope`. Each envelope is a discriminated union: a `Type` field determines how `Spec` is decoded.

### Invariant: Query names are unique within a composite query

Builder queries must have unique names. Formulas reference queries by name (`A`, `B`, `A.0`, `A.my_alias`). Duplicate names would make formula evaluation ambiguous.

### Invariant: Multi-aggregation uses indexed or aliased references

A single builder query can have multiple aggregations. They are accessed in formulas via:
- Index: `A.0`, `A.1` (zero-based)
- Alias: `A.total`, `A.error_count`

The default (just `A`) resolves to index 0. This is the formula evaluation contract and must be preserved.

### Invariant: Type-specific decoding through signal detection

Builder queries are decoded by first peeking at the `signal` field in the raw JSON, then unmarshaling into the appropriate generic type (`QueryBuilderQuery[TraceAggregation]`, `QueryBuilderQuery[LogAggregation]`, `QueryBuilderQuery[MetricAggregation]`). This two-pass decoding is intentional — it allows each signal to have its own aggregation schema while sharing the query structure.

---

## The Metadata Layer

### MetadataStore

The `MetadataStore` interface provides runtime field discovery and type resolution. It answers questions like "what fields exist for this signal?" and "what are the data types of field X?".

### Principle: Fields can be ambiguous until resolved

The same name can map to multiple `TelemetryFieldKey` variants (different contexts, different types). The metadata store returns *all* variants. Resolution to a single field happens during query building, using the query's signal and any explicit context/type hints from the user.

**Consequence:** Code that calls `GetKey` or `GetKeys` must handle multiple results. Do not assume a name maps to a single field. `querybuilder.Resolve` is where the variants settle: it returns every interpretation as a `LogicalField`, marks the result `Ambiguous`, and carries the warning.

### Principle: Materialized fields are a performance optimization, not a semantic distinction

A materialized field and its non-materialized equivalent represent the same logical field. The `Materialized` flag tells the storage's `Read` to generate a simpler column expression. The user should never need to know whether a field is materialized.

### Principle: JSON body fields require access plans

Fields inside JSON body columns (`body.response.errors[].code`) need pre-computed `JSONAccessPlan` trees that encode the traversal path, including branching at array boundaries between `Array(JSON)` and `Array(Dynamic)` representations. These plans are computed during metadata resolution, not during query execution.

---

## Summary of Inviolable Rules

1. **User-facing types never contain ClickHouse column names or SQL fragments.**
2. **Field-to-column translation only happens in a Storage (`Read`, `Exists`, `Fallback`).**
3. **Normalization happens once at the API boundary, never deeper.**
4. **Historical aliases in fieldContexts and fieldDataTypes must not be removed.**
5. **Formula evaluation stays in Go — do not push it into ClickHouse JOINs.**
6. **Zero-defaulting is aggregation-type-dependent — do not universally default to zero.**
7. **The exists guard derives from `AddDefaultExistsFilter` and `Absent`; positive operators guard sentinel reads, negative operators never guard.**
8. **Post-processing functions operate on Go result sets, not in SQL.**
9. **All user-facing types reject unknown JSON fields with suggestions.**
10. **Validation rules are gated by request type.**
11. **Query names must be unique within a composite query.**
12. **The three-layer abstraction stack (Storage -> querybuilder generic layer -> StatementBuilder) must not be bypassed or flattened. A storage describes its field keys; the generic layer decides.**
