package telemetryai

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// TraceColumn is one per-trace enrichment column. It is declarative: either a
// fixed SQL expression over intrinsic columns (Intrinsic), or an aggregate over an
// attribute the builder resolves through the field mapper (Attr). Keeping attribute
// access out of the projection means every field goes through the evolution/
// materialization-aware resolver — no hardcoded map lookups.
type TraceColumn struct {
	Alias     string
	Orderable bool
	Intrinsic string   // fixed SQL over intrinsic columns; used verbatim (nil Attr)
	Attr      *AttrAgg // field-mapper-resolved aggregate (nil Intrinsic)
}

// AttrAgg describes an aggregate the builder assembles after resolving fields:
//   - Func "count" + ExistsKey  -> countIf(<ExistsKey EXISTS>)   (e.g. llm_call_count)
//   - Func + ValueKey           -> Func(<resolved value>)         (e.g. sum tokens)
//   - Func + ValueExpr + Scoped -> FuncIf(<value>, <gate mask>)   (e.g. last_activity_time)
type AttrAgg struct {
	Func      string                            // sum | max | min | count
	ValueKey  *telemetrytypes.TelemetryFieldKey // attribute value to aggregate (resolved as Float64)
	ValueExpr string                            // fixed value expr when ValueKey is nil (e.g. "timestamp")
	Scoped    bool                              // wrap as <Func>If(value, <gate mask>)
	ExistsKey *telemetrytypes.TelemetryFieldKey // count spans where this key exists (countIf)
}

// ProjectionProvider decides which per-trace columns the list computes and which
// are sortable, decoupled from selection and topology.
type ProjectionProvider interface {
	Columns() []TraceColumn
	// DefaultOrderAlias is sorted by (desc) when the query gives no order.
	DefaultOrderAlias() string
	// HavingAliases are the computed per-trace columns that only exist
	// post-aggregation (filterable as HAVING/AND, never OR-ed with span keys).
	// Excludes aliases that are also real span/resource keys (e.g. service.name).
	HavingAliases() []string
}

// CommonTraceColumns are domain-neutral intrinsic columns any trace list can reuse.
func CommonTraceColumns() []TraceColumn {
	return []TraceColumn{
		{Alias: "start_time", Intrinsic: "min(timestamp)", Orderable: true},
		{Alias: "end_time", Intrinsic: "max(timestamp)", Orderable: true},
		// alias intentionally matches the raw span column `duration_nano`; ClickHouse
		// resolves the inner reference to the column and ORDER BY/HAVING to this alias
		// (verified — no cyclic-alias error).
		{Alias: "duration_nano", Intrinsic: "(max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp)))", Orderable: true},
		{Alias: "span_count", Intrinsic: "count()", Orderable: true},
		// root_span_name is empty for traces without a root span; service resolves
		// via any() since resource attrs are on every span.
		{Alias: "root_span_name", Intrinsic: "anyIf(name, parent_span_id = '')", Orderable: false},
		{Alias: "service.name", Intrinsic: "any(resource_string_service$$name)", Orderable: false},
	}
}

// genAIProjectionProvider adds AI/LLM per-trace metrics to the common columns.
type genAIProjectionProvider struct{}

var _ ProjectionProvider = (*genAIProjectionProvider)(nil)

func NewGenAIProjectionProvider() ProjectionProvider {
	return &genAIProjectionProvider{}
}

// genAIAttrKey builds an attribute field key for a gen_ai attribute; the builder
// resolves it through the field mapper.
func genAIAttrKey(name string, dt telemetrytypes.FieldDataType) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{
		Name:          name,
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: dt,
	}
}

func (genAIProjectionProvider) Columns() []TraceColumn {
	reqModel := genAIAttrKey(telemetrytypes.GenAIRequestModel, telemetrytypes.FieldDataTypeString)
	inTok := genAIAttrKey(telemetrytypes.GenAIUsageInputTokens, telemetrytypes.FieldDataTypeFloat64)
	outTok := genAIAttrKey(telemetrytypes.GenAIUsageOutputTokens, telemetrytypes.FieldDataTypeFloat64)

	cols := CommonTraceColumns()
	return append(cols,
		// LLM calls only (request model present), not the full gate (tool/agent too).
		TraceColumn{Alias: "llm_call_count", Orderable: true, Attr: &AttrAgg{Func: "count", ExistsKey: &reqModel}},
		// tokens live only on LLM spans, so a plain sum over resolved values (NULL
		// elsewhere) is correct without scoping to the mask. Aliases match the OTel
		// source attributes (gen_ai.usage.input_tokens / output_tokens).
		TraceColumn{Alias: "input_tokens", Orderable: true, Attr: &AttrAgg{Func: "sum", ValueKey: &inTok}},
		TraceColumn{Alias: "output_tokens", Orderable: true, Attr: &AttrAgg{Func: "sum", ValueKey: &outTok}},
		// timestamp of the last in-scope (gen_ai: LLM/tool/agent) span.
		TraceColumn{Alias: "last_activity_time", Orderable: true, Attr: &AttrAgg{Func: "max", ValueExpr: "timestamp", Scoped: true}},
	)
}

func (genAIProjectionProvider) DefaultOrderAlias() string { return "last_activity_time" }

func (genAIProjectionProvider) HavingAliases() []string {
	// every computed column except service.name (a real resource key, filterable
	// at the span level).
	return []string{
		"start_time", "end_time", "duration_nano", "span_count", "root_span_name",
		"llm_call_count", "input_tokens", "output_tokens", "last_activity_time",
	}
}
