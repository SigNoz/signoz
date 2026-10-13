# ClickHouse SQL

Telemetry queries are generated as ClickHouse SQL text, most of it through [go-sqlbuilder](https://github.com/huandu/go-sqlbuilder) and executed with [clickhouse-go](https://github.com/ClickHouse/clickhouse-go). Attribute names, label names, body keys, aliases and dashboard variable values are user or telemetry input, so every one of them has to be quoted before it becomes part of the text.

## How do I quote a name or a value?

Use [pkg/clickhousesql](/pkg/clickhousesql/clickhousesql.go). Never build a quoted token with `fmt.Sprintf`, string concatenation or `strings.ReplaceAll`.

| You need | Use | Example |
| --- | --- | --- |
| a column, alias or JSON sub-column name | `clickhousesql.Identifier(name)` | `` body_v2.`user.name` `` |
| a string in a map read, a function argument, an `IN` list | `clickhousesql.StringLiteral(value)` | `attributes_string['http.method']` |
| a Go scalar or list rendered as a literal | `clickhousesql.Literal(value)` | `['a','b']` |
| a needle for `LIKE` | `clickhousesql.LikePattern(value)` | `"%" + clickhousesql.LikePattern(name) + "%"` |

```go
expr := fmt.Sprintf("multiIf(mapContains(%s, %s), %s[%s], NULL)", column, clickhousesql.StringLiteral(key.Name), column, clickhousesql.StringLiteral(key.Name))
alias := clickhousesql.Identifier(fmt.Sprintf("__GROUP_BY_KEY_%d_%s", i, key.Name))
```

Values compared against a column are bound as arguments (`sb.E(column, value)`), never rendered into the text.

Filter expressions are a different language. A value placed into a filter expression string goes through `querybuilder.FilterStringLiteral`, which quotes for that grammar.

## Where does `sqlbuilder.Escape` go?

go-sqlbuilder compiles the text it is given: `$0`, `$1`, `${name}` and `$?` are read as argument references and `$$` as a single `$`. The compiled text is everything passed to `Select`, `SelectMore`, `GroupBy`, `OrderBy`, `Having`, `From`, a raw string passed to `Where`, `And` or `Or`, and a compiled subquery joined or selected from another builder, which is compiled a second time. The `Cond` helpers (`sb.E`, `sb.Like`, `sb.In`, `sb.IsNotNull`, ...) write their field argument verbatim.

- A name or expression that ends up in compiled text is wrapped with `sqlbuilder.Escape` once, at the point where it enters that text. Materialized column names carry `$$`, so this is what keeps them intact.
- A field passed to a `Cond` helper is not escaped.
- Text that never passes through a builder is not escaped: CTE fragments joined with `querybuilder.CombineCTEs`, a `UNION` assembled with `fmt.Sprintf` from already compiled statements, raw queries sent straight to the store.
- Bind placeholders produced by `sb.Var` or the `Cond` helpers must not be escaped, so escape the identifier-bearing part before combining it with them: `fmt.Sprintf("match(%s, %s)", sqlbuilder.Escape(fieldExpr), sb.Var(value))`.

## How do I check SQL a user wrote?

A statement typed into a ClickHouse query panel is validated with `clickhousesql.ErrIfStatementIsNotValid`. It parses the text with [clickhouse-sql-parser](https://github.com/AfterShip/clickhouse-sql-parser) and refuses anything but a single `SELECT`, a table function other than the row generators (`numbers`, `zeros`, `generate_series`), a function that reads a file, a dictionary or the server binary, the `system` and `information_schema` databases, and a `SETTINGS readonly` override. Each refusal carries one of the package's `Code*` values.

## Why is `$` written as `\x24`?

Inside an identifier or a literal, `clickhousesql` writes a `$` as `\x24` when a digit, `{` or `?` follows; ClickHouse decodes the escape, so the name is unchanged on the server. Two tools between the builder and ClickHouse read such a `$` as a placeholder: go-sqlbuilder resolves `$0` in a compiled fragment to its own WHERE clause and recurses, and clickhouse-go refuses a query that mixes a `$<digits>` numeric placeholder with `?` arguments. Any other `$` stays literal, so `resource_string_service$$name` renders exactly as written.

## What should I remember?

- Every identifier and literal built from a name or a value goes through `pkg/clickhousesql`.
- `sqlbuilder.Escape` wraps compiled text once; `Cond` fields and text assembled outside the builder are left alone.
- Filter expression literals use `querybuilder.FilterStringLiteral`.
- A statement written by a user is validated with `clickhousesql.ErrIfStatementIsNotValid`.
- When adding a builder or a module that emits SQL, run its queries with a name containing a backtick, a quote, a backslash and `$0`; the integration suites under `tests/integration/tests/queriercommon` do this for the query builder.
