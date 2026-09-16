# SQL Compiler

To support search on any entity's list page (dashboards, alert rules, ...), use [pkg/parser/filterquery/sqlcompiler](/pkg/parser/filterquery/sqlcompiler/compiler.go). It compiles a filter DSL string into a WHERE clause for the relational store: `?`-placeholder SQL plus bind arguments, ready for bun on both SQLite and Postgres. This doc explains what the compiler already does and what an adopting module supplies: a `FieldResolver` that says which keys exist and what each maps to.

The dashboards list is the adopter today; the alert rules list revamp is adopting it next.

## What is the DSL?

A few queries, from simple to full:

```
payment
status = active AND name CONTAINS cpu
(labels.team IN ('infra', 'platform') OR labels.env EXISTS) AND created_at > '2025-01-01T00:00:00Z'
"name = something"
```

- `payment` is free text: a bare token with no key, matched as a substring wherever the module decides (name, description, ...).
- `status = active AND name CONTAINS cpu` is two comparisons of the shape `key OP value`. The `AND` is optional; adjacent terms are an implicit `AND`.
- The third query shows grouping and precedence: parentheses > `NOT` > `AND` > `OR`. Values are bare tokens or quoted strings; `IN` accepts `in(...)` and `[...]` forms.
- `"name = something"` is quoted, so it is free text for that exact phrase instead of a `name = something` comparison. Quoting is the escape hatch for a phrase that looks like DSL.

The grammar lives at [grammar/FilterQuery.g4](/grammar/FilterQuery.g4) (see its `comparison` rule for the full operator list), with the ANTLR-generated parser in [pkg/parser/filterquery/grammar](/pkg/parser/filterquery/grammar). It is the same grammar the telemetry search bars use, so the query language feels identical everywhere.

## What does the framework already cover?

```go
compiled, errs := sqlcompiler.Compile(query, formatter, resolver)
```

`Compile` returns either a non-nil `*Compiled` or a list of human-readable errors. An empty query compiles to an empty `Compiled`; callers gate on `IsEmpty()`, not nil. The package handles:

- Parsing, with syntax errors collected at line/column positions instead of failing on the first one.
- The boolean tree: `AND`/`OR`/`NOT`, parentheses, implicit `AND`, and pruning of empty conditions.
- Operator extraction, including inversion of `NOT LIKE`, `NOT IN`, `NOT EXISTS` and friends.
- Typed value extraction with accumulated errors: the user sees every problem in the query at once.
- Argument binding through go-sqlbuilder; no value is ever interpolated into the SQL text.

The resolver is called once per term and builds each predicate with helpers the compiler provides (next section).

## When do I write a FieldResolver?

Whenever a module adopts the DSL for its list page. The resolver is the per-module policy and the only code you write:

```go
type FieldResolver interface {
	ResolveComparison(v *Visitor, key string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string
	ResolveFreeText(v *Visitor, value string) string
}
```

- `ResolveComparison` is called once per `key OP value` term. It decides whether the key exists and which column expression it maps to, and returns the SQL predicate for the term.
- `ResolveFreeText` is called for a bare or quoted keyless token. It returns a predicate matching the token across whatever the module considers searchable (name, description, tags, ...).
- Both report a bad key, operator or value with `v.AddError(...)` and return `""`. Never panic, never fail fast; the compile fails at the end with all accumulated errors.

The `*Visitor` passed in provides everything needed to build predicates. Use these instead of hand-building SQL or managing arguments yourself:

| On the `Visitor` | Use |
| --- | --- |
| `Sb` | the compile's root `SelectBuilder`; predicates and their arguments attach to it |
| `Formatter` | dialect-portable column expressions (`JSONExtractString`, `LowerExpression`) valid on both SQLite and Postgres |
| `BuildStringOperation` | `=`, `!=`, `LIKE`/`ILIKE`, `CONTAINS`, `IN` on a string column; escapes `%`/`_` for `CONTAINS`, rejects patterns ending in a dangling backslash, lowers both sides for `ILIKE` so SQLite and Postgres agree |
| `BuildTimestampComparison` | equality, ranges and `BETWEEN` on RFC3339 timestamps |
| `BuildBoolComparison` | `= true/false` |
| `BuildFreeTextContains` | case-insensitive substring match, `COALESCE`d so `NOT (...)` does not drop rows where the column is NULL |
| `ExtractSingleStringValue`, `ExtractStringValueList` | typed value extraction when building a custom predicate |
| `AddError` | report a problem; errors accumulate |

In the simplest case, keys map straight to columns and the resolver is a switch. Trimmed from the dashboards resolver:

```go
func (r dashboardFieldResolver) ResolveComparison(v *sqlcompiler.Visitor, key string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string {
	switch key {
	case "created_by":
		return v.BuildStringOperation(v.Sb, ctx, operation, "dashboard.created_by", key)
	case "created_at":
		return v.BuildTimestampComparison(ctx, operation, "dashboard.created_at")
	case "locked":
		return v.BuildBoolComparison(ctx, operation, "dashboard.locked")
	}
	v.AddError("unknown key %q", key)
	return ""
}

func (dashboardFieldResolver) ResolveFreeText(v *sqlcompiler.Visitor, value string) string {
	nameColumn := string(v.Formatter.JSONExtractString("dashboard.data", "$.spec.display.name"))
	return v.BuildFreeTextContains(v.Sb, nameColumn, value)
}
```

### Special cases

Each entity decides its own key policy; the full dashboards resolver, [pkg/modules/dashboard/impldashboard/listfilter_resolver.go](/pkg/modules/dashboard/impldashboard/listfilter_resolver.go), shows the patterns seen so far:

- Operator allowlists: dashboards declares `DSLKey` constants and a `ReservedOps` map of key to allowed operators in `pkg/types/dashboardtypes`, and rejects a disallowed operator with `AddError`. If the entity has reserved keys, the list API can advertise them (e.g. as `reservedKeywords`) so frontend suggestions never go stale.
- JSON columns: name and description live inside `dashboard.data`, extracted with `v.Formatter.JSONExtractString`.
- Relation tables (dashboard tags, rule labels): build an `EXISTS` subquery on a fresh `sqlbuilder.SelectBuilder` and pass that builder into `BuildStringOperation`, so its arguments thread through the compile. For a negative operator, build the positive predicate and toggle `NotExists` on the outer builder.

## How to wire it in?

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

## Caveats

- This compiler is for the relational store only. Telemetry filters are a different pipeline; they stay on querybuilder's ClickHouse visitor.
- It compiles a subset of the grammar: `has(...)` function calls and `search(...)` are not implemented and fall through to `ResolveFreeText` as literal text, and `REGEXP` is rejected by `BuildStringOperation`.
