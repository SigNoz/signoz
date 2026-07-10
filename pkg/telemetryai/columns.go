package telemetryai

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// TraceColumn is one per-trace output column: an alias, whether it can be sorted
// on, and the Aggregate that renders its SQL.
type TraceColumn struct {
	Alias string
	// Orderable marks a column usable in ORDER BY and the aggregate filter. All-span
	// aggregates (span_count, duration_nano, …) are display-only and set false.
	Orderable bool
	// SpanLevel marks a column that merely surfaces a real span/resource attribute
	// (service.name, input/output messages). It is excluded from AggregateAliases so a
	// filter on that attribute is applied span-level, not treated as a trace aggregate.
	SpanLevel bool
	Expr      Aggregate
}

// Aggregate renders one column's SQL against the query resolver, and lists the
// attribute keys it references so the builder can pre-fetch them from metadata.
// Build one with the constructors below (Intrinsic, CountExists, Reduce, …); the
// zero value is not usable.
type Aggregate struct {
	keys   []*telemetrytypes.TelemetryFieldKey
	render func(r aggResolver) (expr string, args []any, err error)
}

// aggResolver hands each aggregate the two field-mapper primitives it may need — an
// EXISTS predicate and a resolved value expression — plus the gen_ai gate mask. The
// builder populates it per query (see resolveColumns).
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

// ScopedToKey renders <fn>If(<valueExpr>, <scopeKey> EXISTS) — a fixed value
// aggregated only over spans carrying scopeKey (e.g. max LLM latency).
func ScopedToKey(fn AggFunc, valueExpr string, scopeKey *telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: keysOf(scopeKey), render: func(r aggResolver) (string, []any, error) {
		cond, args, err := r.exists(scopeKey)
		return fmt.Sprintf("%sIf(%s, %s)", fn, valueExpr, cond), args, err
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

// SumOfKeys renders sum(<v1>) + sum(<v2>) + … over several resolved numeric attributes.
func SumOfKeys(dt telemetrytypes.FieldDataType, valueKeys ...*telemetrytypes.TelemetryFieldKey) Aggregate {
	return Aggregate{keys: valueKeys, render: func(r aggResolver) (string, []any, error) {
		parts := make([]string, 0, len(valueKeys))
		var args []any
		for _, k := range valueKeys {
			v, vargs, err := r.value(k, dt)
			if err != nil {
				return "", nil, err
			}
			parts = append(parts, fmt.Sprintf("sum(%s)", v))
			args = append(args, vargs...)
		}
		return strings.Join(parts, " + "), args, nil
	}}
}

func keysOf(k *telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey {
	return []*telemetrytypes.TelemetryFieldKey{k}
}

// --- Provider --------------------------------------------------------------
// The columns a trace list computes, decoupled from selection and topology.

type ColumnProvider interface {
	Columns() []TraceColumn
	// DefaultOrderAlias is sorted by (desc) when the query gives no order.
	DefaultOrderAlias() string
	// AggregateAliases are the computed per-trace column names, used to classify a filter
	// key as trace-level vs span-level. Excludes SpanLevel columns (see TraceColumn.SpanLevel).
	AggregateAliases() []string
}

// CommonTraceColumns are domain-neutral intrinsic columns any trace list can reuse.
// All aggregate over every span, so none is Orderable — output-only (see TraceColumn.Orderable).
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

// --- gen_ai provider -------------------------------------------------------
// Adds AI/LLM per-trace metrics on top of the common columns.

type genAIColumnProvider struct{}

var _ ColumnProvider = (*genAIColumnProvider)(nil)

func NewGenAIColumnProvider() ColumnProvider {
	return &genAIColumnProvider{}
}

func (genAIColumnProvider) Columns() []TraceColumn {
	defs := telemetrytypes.GenAIFieldDefinitions
	reqModel := defs[telemetrytypes.GenAIRequestModel]
	toolName := defs[telemetrytypes.GenAIToolName]
	inTok := defs[telemetrytypes.GenAIUsageInputTokens]
	outTok := defs[telemetrytypes.GenAIUsageOutputTokens]
	cost := defs[telemetrytypes.SignozGenAITotalCost]
	inMsg := defs[telemetrytypes.GenAIInputMessages]
	outMsg := defs[telemetrytypes.GenAIOutputMessages]

	str := telemetrytypes.FieldDataTypeString
	return append(CommonTraceColumns(),
		// LLM calls only (request model present), not the full gate (which includes tool/agent).
		TraceColumn{Alias: "llm_call_count", Orderable: true, Expr: CountExists(&reqModel)},
		// tool / distinct-tool activity across the trace's tool spans.
		TraceColumn{Alias: "tool_call_count", Orderable: true, Expr: CountExists(&toolName)},
		TraceColumn{Alias: "distinct_tool_count", Orderable: true, Expr: UniqCount(&toolName, str)},
		// tokens live only on LLM spans, so a plain sum is correct without scoping to the gate.
		TraceColumn{Alias: "input_tokens", Orderable: true, Expr: Reduce(AggSum, &inTok)},
		TraceColumn{Alias: "output_tokens", Orderable: true, Expr: Reduce(AggSum, &outTok)},
		TraceColumn{Alias: "total_tokens", Orderable: true, Expr: SumOfKeys(telemetrytypes.FieldDataTypeFloat64, &inTok, &outTok)},
		// per-span total cost attached by the SigNoz LLM pricing processor.
		TraceColumn{Alias: "estimated_cost_usd", Orderable: true, Expr: Reduce(AggSum, &cost)},
		// slowest single LLM call in the trace (duration over request.model spans).
		// duration_nano is table-qualified so it binds to the physical column, not the
		// output alias `duration_nano` (which is itself an aggregate) — else ClickHouse
		// errors with "aggregate function found inside another aggregate function".
		TraceColumn{Alias: "max_llm_latency_ns", Orderable: true, Expr: ScopedToKey(AggMax, spanTable()+".duration_nano", &reqModel)},
		// error spans across the whole trace (any span), so display-only.
		TraceColumn{Alias: "error_count", Expr: PredicateCount("has_error = true")},
		// last gen_ai span (LLM/tool/agent), so scope the max to the gate mask.
		TraceColumn{Alias: "last_activity_time", Orderable: true, Expr: ScopedReduce(AggMax, "timestamp")},
		// display previews: first call's input (the prompt), last call's output (the answer).
		TraceColumn{Alias: "input", SpanLevel: true, Expr: PickBy(&inMsg, str, "timestamp", PickEarliest)},
		TraceColumn{Alias: "output", SpanLevel: true, Expr: PickBy(&outMsg, str, "timestamp", PickLatest)},
	)
}

func (genAIColumnProvider) DefaultOrderAlias() string { return "last_activity_time" }

func (p genAIColumnProvider) AggregateAliases() []string {
	// Derived from Columns() so a new column can't be forgotten. SpanLevel columns
	// surface a real attribute, so a filter on them is applied span-level rather than
	// treated as a trace aggregate — skip those.
	cols := p.Columns()
	aliases := make([]string, 0, len(cols))
	for _, c := range cols {
		if !c.SpanLevel {
			aliases = append(aliases, c.Alias)
		}
	}
	return aliases
}
