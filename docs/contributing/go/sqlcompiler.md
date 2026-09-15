# SQL Compiler

List pages (dashboards, alert rules) share one filter DSL in their search bars. [pkg/parser/filterquery/sqlcompiler](/pkg/parser/filterquery/sqlcompiler/compiler.go) compiles a DSL string into a WHERE clause for the relational store: `?`-placeholder SQL plus bind arguments, ready for bun on both SQLite and Postgres. Telemetry filters are a different pipeline. They stay on querybuilder's ClickHouse visitor.

The package owns everything generic about the language. A module adopting it writes exactly one thing: a `FieldResolver` that says which keys exist and what each maps to.

## What is the DSL?

The grammar lives at [grammar/FilterQuery.g4](/grammar/FilterQuery.g4), with the ANTLR-generated parser in [pkg/parser/filterquery/grammar](/pkg/parser/filterquery/grammar). It is the same grammar the telemetry search bars use, so the query language feels identical everywhere. The shapes that matter:

- Boolean structure: parentheses > `NOT` > `AND` > `OR`; adjacent terms with no connective are an implicit `AND`.
- Comparisons: `key OP value`, e.g. `name CONTAINS cpu`, `created_at > '2025-01-01T00:00:00Z'`, `labels.team IN ('infra', 'platform')`, `labels.env EXISTS`. See the `comparison` rule in the grammar for the full operator list.
- Free text: a bare or quoted token with no key. Quoting is the escape hatch for a phrase that looks like DSL.
- Values: bare tokens or quoted strings; `IN` accepts `in(...)` and `[...]` forms.

## What does the framework already cover?

```go
compiled, errs := sqlcompiler.Compile(query, formatter, resolver)
```

`Compile` returns either a non-nil `*Compiled` or a list of human-readable errors. An empty query compiles to an empty `Compiled`; callers gate on `IsEmpty()`, not nil. On top of parsing, the package handles:

- Syntax errors, collected with line/column positions instead of failing on the first one.
- The boolean tree: `AND`/`OR`/`NOT`, parentheses, implicit `AND`, and pruning of empty conditions.
- Operator extraction, including inversion of `NOT LIKE`, `NOT IN`, `NOT EXISTS` and friends.
- Predicate builders the resolver calls back into:

| Builder                    | Handles                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BuildStringOperation`     | `=`, `!=`, `LIKE`/`ILIKE`, `CONTAINS`, `IN` on a string column; escapes `%`/`_` for `CONTAINS`, rejects patterns ending in a dangling backslash, lowers both sides for `ILIKE` so SQLite and Postgres agree |
| `BuildTimestampComparison` | equality, ranges and `BETWEEN` on RFC3339 timestamps                                                                                                                                                        |
| `BuildBoolComparison`      | `= true/false`                                                                                                                                                                                              |
| `BuildFreeTextContains`    | case-insensitive substring match, `COALESCE`d so `NOT (...)` does not drop rows where the column is NULL                                                                                                    |

- Typed value extraction (`ExtractSingleStringValue`, `ExtractStringValueList`, ...) with accumulated errors: the user sees every problem in the query at once.
- Argument binding through go-sqlbuilder; no value is ever interpolated into the SQL text.

## When do I write a FieldResolver?

Whenever a module adopts the DSL for its list page. The resolver is the per-module policy and the only code you write:

```go
type FieldResolver interface {
	ResolveComparison(v *Visitor, key string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string
	ResolveFreeText(v *Visitor, value string) string
}
```

Rules for implementing one:

- Declare the key namespace in `pkg/types/<domain>`: `DSLKey` constants plus a `ReservedOps` map of key to allowed operators. The list API advertises these as `reservedKeywords`, so the frontend suggestions never go stale.
- Reject a disallowed operator with `v.AddError(...)` and return `""`. Never panic, never fail fast; the compile fails at the end with all errors.
- Map a key to a column expression through `v.Formatter` (`JSONExtractString`, `LowerExpression`), never by hand, so the expression is valid on both SQLite and Postgres.
- Delegate the predicate to the `Build*` helpers above; do not hand-build SQL or manage arguments yourself.
- For a key that lives in a relation table (dashboard tags, rule labels), build an `EXISTS` subquery on a fresh `sqlbuilder.SelectBuilder` and pass that builder into `BuildStringOperation`, so its arguments thread through the compile. For a negative operator, build the positive predicate and toggle `NotExists` on the outer builder.

The reference implementation is the dashboards resolver, [pkg/modules/dashboard/impldashboard/listfilter_resolver.go](/pkg/modules/dashboard/impldashboard/listfilter_resolver.go): reserved keys backed by columns and JSON paths, tag keys via `EXISTS` subqueries, free text across name, description and tags.

## How do I wire it in?

Give the module a thin `Compile` wrapper that maps the error list onto the module's error code, as in [pkg/modules/dashboard/impldashboard/listfilter.go](/pkg/modules/dashboard/impldashboard/listfilter.go):

```go
func Compile(query string, formatter sqlstore.SQLFormatter) (*sqlcompiler.Compiled, error) {
	compiled, errs := sqlcompiler.Compile(query, formatter, dashboardFieldResolver{})
	if len(errs) > 0 {
		return nil, errors.NewInvalidInputf(dashboardtypes.ErrCodeDashboardListFilterInvalid,
			"invalid filter query: %s", strings.Join(errs, "; "))
	}
	return compiled, nil
}
```

The store then appends `compiled.SQL` with `compiled.Args` to its list query when `!compiled.IsEmpty()`.

## What should I remember?

- One DSL, one compiler; a new list page adds a `FieldResolver`, not a new parser or SQL layer.
- Keys and allowed operators live in `pkg/types/<domain>` and are advertised as `reservedKeywords`.
- Column expressions go through `v.Formatter`; predicates go through the `Build*` helpers.
- Report problems with `v.AddError` and return `""`; errors accumulate.
- Relation-table keys use `EXISTS` subqueries on their own builder; negation toggles `NotExists`.
- This package is for the relational store only; telemetry filtering stays in querybuilder.
