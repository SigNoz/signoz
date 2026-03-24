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

The query pipeline is built from four interfaces that compose vertically. Each layer has a single responsibility. Each layer depends only on the layers below it. This layering is intentional and must be preserved.

```
StatementBuilder          <- Orchestrates everything into executable SQL
  ├── AggExprRewriter     <- Rewrites aggregation expressions (maps field refs to columns)
  ├── ConditionBuilder    <- Builds WHERE predicates (field + operator + value -> SQL)
  └── FieldMapper         <- Maps TelemetryFieldKey -> ClickHouse column expression
```

### FieldMapper

**Contract:** Given a `TelemetryFieldKey`, return a ClickHouse column expression that yields the value for that field when used in a SELECT.

**Principle:** This is the *only* place where field-to-column translation happens. No other layer should contain knowledge of how fields map to storage. If you need a column expression, go through the FieldMapper.

**Why:** The user says `http.request.method`. ClickHouse might store it as `attributes_string['http.request.method']`, or as a materialized column `` `attribute_string_http$$request$$method` ``, or via a JSON access path in a body column. This variation is entirely contained within the FieldMapper. Everything above it is storage-agnostic.

### ConditionBuilder

**Contract:** Given a field key, an operator, and a value, produce a valid SQL predicate for a WHERE clause.

**Dependency:** Uses FieldMapper for the left-hand side of the condition.

**Principle:** The ConditionBuilder owns all the complexity of operator semantics, i.e type casting, array operators (`hasAny`/`hasAll` vs `=`), existence checks, and negative operator behavior. This complexity must not leak upward into the StatementBuilder.

### AggExprRewriter

**Contract:** Given a user-facing aggregation expression like `sum(duration_nano)`, resolve field references within it and produce valid ClickHouse SQL.

**Dependency:** Uses FieldMapper to resolve field names within expressions.

**Principle:** Aggregation expressions are user-authored strings that contain field references. The rewriter parses them, identifies field references, resolves each through the FieldMapper, and reassembles the expression.

### StatementBuilder

**Contract:** Given a complete `QueryBuilderQuery`, a time range, and a request type, produces an executable SQL statement.

**Dependency:** Uses all three abstractions above.

**Principle:** This is the composition layer. It does not contain field mapping logic, condition building logic, or expression rewriting logic. It orchestrates the other abstractions. If you find storage-specific logic creeping into the StatementBuilder, push it down into the appropriate abstraction.

### Invariant: No layer skipping

The StatementBuilder must not call FieldMapper directly to build conditions, it goes through the ConditionBuilder. The AggExprRewriter must not hardcode column names, it goes through the FieldMapper. Skipping layers creates hidden coupling and makes the system fragile to storage changes.

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

### Constraint: Existence semantics differ for positive vs negative operators

- **Positive operators** (`=`, `>`, `LIKE`, `IN`, etc.) implicitly assert field existence. `http.method = GET` means "the field exists AND equals GET".
- **Negative operators** (`!=`, `NOT IN`, `NOT LIKE`, etc.) do **not** add an existence check. `http.method != GET` includes records where the field doesn't exist at all.

**Why:** The user's intent with negative operators is ambiguous. Rather than guess, we take the broader interpretation. Users can add an explicit `EXISTS` filter if they want the narrower one. This is documented in `AddDefaultExistsFilter`.

**Consequence:** Any new operator must declare its existence behavior in `AddDefaultExistsFilter`. Do not add operators without considering this.

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

**Consequence:** Code that calls `GetKey` or `GetKeys` must handle multiple results. Do not assume a name maps to a single field.

### Principle: Materialized fields are a performance optimization, not a semantic distinction

A materialized field and its non-materialized equivalent represent the same logical field. The `Materialized` flag tells the FieldMapper to generate a simpler column expression. The user should never need to know whether a field is materialized.

### Principle: JSON body fields require access plans

Fields inside JSON body columns (`body.response.errors[].code`) need pre-computed `JSONAccessPlan` trees that encode the traversal path, including branching at array boundaries between `Array(JSON)` and `Array(Dynamic)` representations. These plans are computed during metadata resolution, not during query execution.

---

## Summary of Inviolable Rules

1. **User-facing types never contain ClickHouse column names or SQL fragments.**
2. **Field-to-column translation only happens in FieldMapper.**
3. **Normalization happens once at the API boundary, never deeper.**
4. **Historical aliases in fieldContexts and fieldDataTypes must not be removed.**
5. **Formula evaluation stays in Go — do not push it into ClickHouse JOINs.**
6. **Zero-defaulting is aggregation-type-dependent — do not universally default to zero.**
7. **Positive operators imply existence, negative operators do not.**
8. **Post-processing functions operate on Go result sets, not in SQL.**
9. **All user-facing types reject unknown JSON fields with suggestions.**
10. **Validation rules are gated by request type.**
11. **Query names must be unique within a composite query.**
12. **The four-layer abstraction stack (FieldMapper -> ConditionBuilder -> AggExprRewriter -> StatementBuilder) must not be bypassed or flattened.**
