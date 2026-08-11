package scopedtracesstatementbuilder

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// TraceScope configures the scoped trace builder: which spans are in scope and which
// per-trace columns the list computes.
type TraceScope struct {
	// FilterExpression is the grammar-level (EXISTS) gate, used on the delegated
	// span-list path.
	FilterExpression string
	// FieldKeys are the gate's keys, used to build the per-span mask.
	FieldKeys []*telemetrytypes.TelemetryFieldKey
	Columns   []TraceColumn
	// DefaultOrderAlias is sorted by (desc) when the query gives no order.
	DefaultOrderAlias string
}

// TraceColumn is one per-trace output column.
type TraceColumn struct {
	// Alias must not reuse a physical span-index column name (e.g. duration_nano):
	// ClickHouse resolves bare identifiers to same-SELECT aliases first, so any
	// expression referencing that column would silently bind to the alias.
	Alias string
	// Orderable columns can be used in ORDER BY, Filterable ones in the aggregate
	// filter; all-span aggregates are display-only and set neither.
	Orderable  bool
	Filterable bool
	// SpanLevel columns surface a real span/resource attribute; a filter on them is
	// applied span-level, so they are excluded from the trace-level aliases.
	SpanLevel bool
	Expr      Aggregate
}

// CommonTraceColumns are domain-neutral columns any trace list can reuse; all
// aggregate over every span, so none is Orderable.
func CommonTraceColumns() []TraceColumn {
	ts := IntrinsicSpanKey("timestamp")
	duration := IntrinsicSpanKey("duration_nano")
	name := IntrinsicSpanKey("name")
	parentSpanID := IntrinsicSpanKey("parent_span_id")
	serviceName := &telemetrytypes.TelemetryFieldKey{
		Name:          "service.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	return []TraceColumn{
		{Alias: "start_time", Expr: FieldReduce(AggMin, ts)},
		{Alias: "end_time", Expr: FieldReduce(AggMax, ts)},
		// not plain "duration_nano": an alias would shadow the intrinsic span field
		{Alias: "trace_duration_nano", Expr: TraceDuration(ts, duration)},
		{Alias: "span_count", Expr: CountAll()},
		{Alias: "root_span_name", Expr: FieldAnyWhere(name, parentSpanID, qbtypes.FilterOperatorEqual, "")},
		{Alias: "service.name", SpanLevel: true, Expr: AnyValue(serviceName, telemetrytypes.FieldDataTypeString)},
	}
}
