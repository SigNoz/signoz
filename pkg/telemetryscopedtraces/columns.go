package telemetryscopedtraces

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// TraceColumn is one per-trace output column.
type TraceColumn struct {
	Alias string
	// Orderable columns can be used in ORDER BY and the aggregate filter. All-span
	// aggregates (span_count, duration_nano, …) are display-only and set false.
	Orderable bool
	// SpanLevel columns surface a real span/resource attribute (service.name,
	// input/output messages); a filter on them is applied span-level, so they are
	// excluded from AggregateAliases.
	SpanLevel bool
	Expr      Aggregate
}

// Aggregate renders one column's SQL and lists the attribute keys it references so
// the builder can pre-fetch their metadata. Build one with the constructors below;
// the zero value is not usable.
type Aggregate struct {
	keys   []*telemetrytypes.TelemetryFieldKey
	render func(r aggResolver) (expr string, args []any, err error)
}

// aggResolver hands each aggregate the field-mapper primitives it may need — an
// EXISTS predicate, a resolved value expression, and the gate mask. Populated per
// query by resolveColumns.
type aggResolver struct {
	exists   func(key *telemetrytypes.TelemetryFieldKey) (string, []any, error)
	value    func(key *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) (string, []any, error)
	maskExpr string
	maskArgs []any
}

// AggFunc is a ClickHouse aggregate function name.
type AggFunc string

const (
	AggSum AggFunc = "sum"
	AggMax AggFunc = "max"
	AggMin AggFunc = "min"
)

// PickDirection selects the earliest (argMin) or latest (argMax) span by ordering.
type PickDirection int

const (
	PickLatest PickDirection = iota
	PickEarliest
)

// Intrinsic emits fixed intrinsic-column SQL verbatim (escaped once).
func Intrinsic(text string) Aggregate {
	return Aggregate{render: func(aggResolver) (string, []any, error) {
		return sqlbuilder.Escape(text), nil, nil
	}}
}

// CountExists renders countIf(<key> EXISTS) — counts spans carrying key.
func CountExists(key *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: keysOf(key), render: func(r aggResolver) (string, []any, error) {
		cond, args, err := r.exists(key)
		return fmt.Sprintf("countIf(%s)", cond), args, err
	}}
}

// Reduce renders <fn>(<value>) over a resolved numeric attribute value.
func Reduce(fn AggFunc, valueKey *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: keysOf(valueKey), render: func(r aggResolver) (string, []any, error) {
		v, args, err := r.value(valueKey, telemetrytypes.FieldDataTypeFloat64)
		return fmt.Sprintf("%s(%s)", fn, v), args, err
	}}
}

// ScopedReduce renders <fn>If(<valueExpr>, <gate mask>) over a fixed value expression.
func ScopedReduce(fn AggFunc, valueExpr string) Aggregate {
	return Aggregate{render: func(r aggResolver) (string, []any, error) {
		return fmt.Sprintf("%sIf(%s, %s)", fn, valueExpr, r.maskExpr), append([]any{}, r.maskArgs...), nil
	}}
}

// ScopedToKeyColumn renders <fn>If(<column>, <scopeKey> EXISTS) — a physical
// span-index column aggregated over spans carrying scopeKey (e.g. max LLM latency).
// Providers pass the bare column name; it is table-qualified here so it binds to the
// physical column and not a same-named output alias, which ClickHouse would reject
// as an aggregate inside an aggregate.
func ScopedToKeyColumn(fn AggFunc, column string, scopeKey *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: keysOf(scopeKey), render: func(r aggResolver) (string, []any, error) {
		cond, args, err := r.exists(scopeKey)
		return fmt.Sprintf("%sIf(%s.%s, %s)", fn, spanTable(), column, cond), args, err
	}}
}

// PickBy renders argMinIf/argMaxIf(<value>, <orderExpr>, <value> EXISTS) — the value
// from the earliest/latest span that carries it.
func PickBy(valueKey *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType, orderExpr string, dir PickDirection) Aggregate {
	fn := "argMaxIf"
	if dir == PickEarliest {
		fn = "argMinIf"
	}
	return Aggregate{keys: keysOf(valueKey), render: func(r aggResolver) (string, []any, error) {
		v, vargs, err := r.value(valueKey, dt)
		if err != nil {
			return "", nil, err
		}
		cond, cargs, err := r.exists(valueKey)
		return fmt.Sprintf("%s(%s, %s, %s)", fn, v, orderExpr, cond), append(vargs, cargs...), err
	}}
}

// UniqCount renders uniqIf(<value>, <value> EXISTS) — distinct count of an attribute.
func UniqCount(valueKey *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) Aggregate {
	return Aggregate{keys: keysOf(valueKey), render: func(r aggResolver) (string, []any, error) {
		v, vargs, err := r.value(valueKey, dt)
		if err != nil {
			return "", nil, err
		}
		cond, cargs, err := r.exists(valueKey)
		return fmt.Sprintf("uniqIf(%s, %s)", v, cond), append(vargs, cargs...), err
	}}
}

// PredicateCount renders countIf(<predicate>) over a fixed boolean predicate.
func PredicateCount(predicate string) Aggregate {
	return Aggregate{render: func(aggResolver) (string, []any, error) {
		return fmt.Sprintf("countIf(%s)", sqlbuilder.Escape(predicate)), nil, nil
	}}
}

// SumOfKeys renders coalesce(sum(<v1>), 0) + coalesce(sum(<v2>), 0) + … over several
// numeric attributes. Coalesced because a key absent from every span sums to NULL and
// NULL + n = NULL — a trace with only output tokens would otherwise total NULL.
func SumOfKeys(dt telemetrytypes.FieldDataType, valueKeys ...*telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: valueKeys, render: func(r aggResolver) (string, []any, error) {
		parts := make([]string, 0, len(valueKeys))
		var args []any
		for _, k := range valueKeys {
			v, vargs, err := r.value(k, dt)
			if err != nil {
				return "", nil, err
			}
			parts = append(parts, fmt.Sprintf("coalesce(sum(%s), 0)", v))
			args = append(args, vargs...)
		}
		return strings.Join(parts, " + "), args, nil
	}}
}

func keysOf(k *telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey {
	return []*telemetrytypes.TelemetryFieldKey{k}
}

// ColumnProvider supplies the columns a trace list computes.
type ColumnProvider interface {
	Columns() []TraceColumn
	// DefaultOrderAlias is sorted by (desc) when the query gives no order.
	DefaultOrderAlias() string
	// AggregateAliases are the computed per-trace column names, used to classify a
	// filter key as trace-level vs span-level. Excludes SpanLevel columns.
	AggregateAliases() []string
	// ActivityGateAlias names the column that must be > 0 for a per-trace row to feed
	// trace-level (trace.) aggregations; empty disables the gate.
	ActivityGateAlias() string
}

// CommonTraceColumns are domain-neutral columns any trace list can reuse. All
// aggregate over every span, so none is Orderable.
func CommonTraceColumns() []TraceColumn {
	return []TraceColumn{
		{Alias: "start_time", Expr: Intrinsic("min(timestamp)")},
		{Alias: "end_time", Expr: Intrinsic("max(timestamp)")},
		{Alias: "duration_nano", Expr: Intrinsic("(max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp)))")},
		{Alias: "span_count", Expr: Intrinsic("count()")},
		{Alias: "root_span_name", Expr: Intrinsic("anyIf(name, parent_span_id = '')")},
		{Alias: "service.name", SpanLevel: true, Expr: Intrinsic("any(resource_string_service$$name)")},
	}
}
