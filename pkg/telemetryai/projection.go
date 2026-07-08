package telemetryai

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type TraceColumn struct {
	Alias string
	// Orderable marks a column computable in the mask-pruned `matched` pass (a
	// gen_ai-scoped aggregate): the only columns usable for ORDER BY and the
	// aggregate filter. All-span columns (span_count, duration_nano, …) are false —
	// they are output-only, since the matched pass sees only gen_ai spans.
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
	// AggregateAliases are the computed per-trace (trace-level) column names, used to
	// classify which filter keys are trace-level vs span-level. Only the Orderable
	// subset is actually usable in ORDER BY / the aggregate filter; the rest are
	// output-only. Excludes aliases that are also real span/resource keys (service.name).
	AggregateAliases() []string
}

// CommonTraceColumns are domain-neutral intrinsic columns any trace list can reuse.
// All are over-all-spans intrinsics, so none is Orderable (not computable in the
// mask-pruned matched pass) — they are output-only, computed in the enrichment scan.
func CommonTraceColumns() []TraceColumn {
	return []TraceColumn{
		{Alias: "start_time", Intrinsic: "min(timestamp)", Orderable: false},
		{Alias: "end_time", Intrinsic: "max(timestamp)", Orderable: false},
		{Alias: "duration_nano", Intrinsic: "(max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp)))", Orderable: false},
		{Alias: "span_count", Intrinsic: "count()", Orderable: false},

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

func (genAIProjectionProvider) Columns() []TraceColumn {
	// Key definitions (name/context/type) live once in GenAIFieldDefinitions, shared
	// with the metadata enrichment. Copy to locals so we can take their address.
	reqModel := telemetrytypes.GenAIFieldDefinitions[telemetrytypes.GenAIRequestModel]
	inTok := telemetrytypes.GenAIFieldDefinitions[telemetrytypes.GenAIUsageInputTokens]
	outTok := telemetrytypes.GenAIFieldDefinitions[telemetrytypes.GenAIUsageOutputTokens]

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

func (genAIProjectionProvider) AggregateAliases() []string {
	// every computed column except service.name (a real resource key, filterable
	// at the span level). Of these, only the gen_ai-scoped ones (llm_call_count,
	// input_tokens, output_tokens, last_activity_time) are Orderable and thus usable
	// in ORDER BY / the aggregate filter; the rest are output-only.
	return []string{
		"start_time", "end_time", "duration_nano", "span_count", "root_span_name",
		"llm_call_count", "input_tokens", "output_tokens", "last_activity_time",
	}
}
