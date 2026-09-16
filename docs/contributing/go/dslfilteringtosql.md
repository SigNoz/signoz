# DSL Filtering to SQL

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

type Compiled struct {
	SQL  string
	Args []any
}
```

`Compile` returns either a non-nil `*Compiled` or a list of human-readable errors. `Compiled.SQL` is the WHERE clause with `?` placeholders and `Compiled.Args` holds the bind arguments in placeholder order; the store passes both to bun. An empty query compiles to an empty `Compiled`; callers gate on `IsEmpty()`, not nil. The package handles:

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

In the simplest case, keys map straight to columns and the resolver is a switch. A dummy resolver for an imaginary `sample_entity` table:

```go
func (r sampleEntityFieldResolver) ResolveComparison(v *sqlcompiler.Visitor, key string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string {
	switch key {
	case "created_by":
		return v.BuildStringOperation(v.Sb, ctx, operation, "sample_entity.created_by", key)
	case "created_at":
		return v.BuildTimestampComparison(ctx, operation, "sample_entity.created_at")
	case "locked":
		return v.BuildBoolComparison(ctx, operation, "sample_entity.locked")
	}
	v.AddError("unknown key %q", key)
	return ""
}

func (sampleEntityFieldResolver) ResolveFreeText(v *sqlcompiler.Visitor, value string) string {
	return v.BuildFreeTextContains(v.Sb, "sample_entity.name", value)
}
```

### Special cases

Each entity decides its own key policy; the full dashboards resolver, [pkg/modules/dashboard/impldashboard/listfilter_resolver.go](/pkg/modules/dashboard/impldashboard/listfilter_resolver.go), shows the patterns seen so far.

#### Reserved keys and operator allowlists

An entity usually claims a fixed set of column-level keys for its DSL: the reserved keys. For dashboards these are `name`, `description`, `created_at`, `updated_at`, `created_by`, `locked` and `source`, declared as `DSLKey` constants in [pkg/types/dashboardtypes](/pkg/types/dashboardtypes/perses_dashboard.go). A reserved key always resolves to the entity's own data; anything else (a tag key like `team`) is resolved differently or rejected. The list API can also advertise the set (dashboards and rules return `reservedKeywords`) so frontend suggestions never go stale.

Not every operator makes sense on every reserved key (`name BETWEEN ...` does not), so dashboards pairs each reserved key with the operators it accepts and checks the map before building:

```go
var ReservedOps = map[DSLKey]map[qbtypesv5.FilterOperator]struct{}{
	DSLKeyName:      stringSearchOps(),
	DSLKeyCreatedAt: numericRangeOps(),
	DSLKeyLocked:    boolOps(),
}

if _, allowed := allowedOperations[operation]; !allowed {
	v.AddError("operator %s is not allowed for key %q", sqlcompiler.OperationName(operation), key)
	return ""
}
```

#### JSON columns

Dashboard name and description live inside the `dashboard.data` JSON column, so the resolver builds the column expression with `v.Formatter.JSONExtractString`, which renders correctly on both dialects. `name CONTAINS cpu` compiles (SQLite flavor) to:

```sql
json_extract("dashboard"."data", '$.spec.display.name') LIKE ? ESCAPE '\'
-- args: ["%cpu%"]
```

#### Relation tables

Dashboard tags live in the shared `tag`/`tag_relation` tables, so a tag term becomes an `EXISTS` subquery. Build it on a fresh `sqlbuilder.SelectBuilder` and pass that builder into `BuildStringOperation`, so its arguments thread through the compile. `team = infra` compiles to:

```sql
EXISTS (SELECT 1 FROM tag_relation tr JOIN tag t ON t.id = tr.tag_id
	WHERE tr.kind = ? AND tr.resource_id = dashboard.id
	AND LOWER(t.key) = LOWER(?) AND t.value = ?)
-- args: ["\"dashboard\"", "team", "infra"]
```

For a negative operator (`team != infra`), build the positive predicate and toggle `NotExists` on the outer builder, so rows without the tag at all also match.

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
- A `key REGEXP value` term parses, but no predicate builder implements it: `BuildStringOperation` rejects it with an error, since SQLite has no portable `REGEXP` (Postgres spells it `~`). A resolver may implement it itself for a dialect it controls.
- `has(...)` function calls and `search(...)` from the telemetry grammar are not implemented; they fall through to `ResolveFreeText` as literal text.
