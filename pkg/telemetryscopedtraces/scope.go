package telemetryscopedtraces

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// TraceScope is the configuration the scoped trace builder accepts: which spans are
// in scope and which per-trace columns the list computes. It only declares the gate
// and the columns; the builder resolves everything through the field mapper, so
// attribute access stays materialization-aware. A new span category only needs a
// new TraceScope.
type TraceScope struct {
	// FilterExpression is the grammar-level (EXISTS) gate, used on the delegated
	// span-list path.
	FilterExpression string
	// FieldKeys are the gate's keys, used to build the per-span mask
	// (OR of resolved EXISTS conditions).
	FieldKeys []*telemetrytypes.TelemetryFieldKey
	// Columns are the per-trace output columns.
	Columns []TraceColumn
	// DefaultOrderAlias is sorted by (desc) when the query gives no order.
	DefaultOrderAlias string
}

// TraceColumn is one per-trace output column.
type TraceColumn struct {
	// Alias must not reuse a physical span-index column name (e.g. duration_nano):
	// ClickHouse resolves bare identifiers to same-SELECT aliases first, so any
	// expression referencing that column would silently bind to the alias.
	Alias string
	// Orderable columns can be used in ORDER BY and the aggregate filter. All-span
	// aggregates (span_count, trace_duration_nano, …) are display-only and set false.
	Orderable bool
	// SpanLevel columns surface a real span/resource attribute (service.name,
	// input/output messages); a filter on them is applied span-level, so they are
	// excluded from the trace-level aliases.
	SpanLevel bool
	Expr      Aggregate
}

// CommonTraceColumns are domain-neutral columns any trace list can reuse. All
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
		// Not plain "duration_nano": that name is the intrinsic span field, and an
		// alias would shadow it — both in ClickHouse identifier resolution and in
		// bare-name filter classification.
		{Alias: "trace_duration_nano", Expr: TraceDuration(ts, duration)},
		{Alias: "span_count", Expr: CountAll()},
		{Alias: "root_span_name", Expr: FieldAnyWhere(name, parentSpanID, qbtypes.FilterOperatorEqual, "")},
		{Alias: "service.name", SpanLevel: true, Expr: AnyValue(serviceName, telemetrytypes.FieldDataTypeString)},
	}
}
