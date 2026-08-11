package scopedtracesstatementbuilder

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRewriteTraceAggregation(t *testing.T) {
	cols := map[string]struct{}{
		"input_tokens": {}, "output_tokens": {}, "total_tokens": {}, "llm_call_count": {}, "max_llm_latency_ns": {},
	}

	cases := []struct {
		name    string
		expr    string
		isTrace bool
		want    string // rewritten expr, only checked when isTrace
		used    []string
		wantErr string
	}{
		{name: "avg trace col", expr: "avg(trace.output_tokens)", isTrace: true, want: "avg(output_tokens)", used: []string{"output_tokens"}},
		{name: "sum trace col", expr: "sum(trace.total_tokens)", isTrace: true, want: "sum(total_tokens)", used: []string{"total_tokens"}},
		{name: "count traces", expr: "count(trace.trace_id)", isTrace: true, want: "count(trace_id)"},
		{name: "p90 trace col", expr: "p90(trace.max_llm_latency_ns)", isTrace: true, want: "quantile(0.90)(max_llm_latency_ns)", used: []string{"max_llm_latency_ns"}},
		{name: "arithmetic between trace cols", expr: "avg(trace.output_tokens + trace.input_tokens)", isTrace: true, want: "avg(output_tokens + input_tokens)", used: []string{"output_tokens", "input_tokens"}},
		{name: "arithmetic with constant", expr: "sum(trace.output_tokens * 1.5)", isTrace: true, want: "sum(output_tokens * 1.5)", used: []string{"output_tokens"}},
		{name: "ratio of two aggregations", expr: "sum(trace.output_tokens)/count(trace.trace_id)", isTrace: true, want: "sum(output_tokens) / count(trace_id)", used: []string{"output_tokens"}},
		{name: "backquoted trace col", expr: "avg(`trace.output_tokens`)", isTrace: true, want: "avg(`output_tokens`)", used: []string{"output_tokens"}},
		{name: "bare count is span-level", expr: "count()", isTrace: false},
		{name: "span attribute is span-level", expr: "sum(gen_ai.usage.output_tokens)", isTrace: false},
		{name: "countIf span predicate is span-level", expr: "countIf(has_error = true)", isTrace: false},
		{name: "mixed domains in one expression", expr: "sum(trace.output_tokens) + sum(gen_ai.usage.input_tokens)", wantErr: "mixes trace-level"},
		{name: "mixed domains in one function", expr: "sum(trace.output_tokens + gen_ai.usage.input_tokens)", wantErr: "mixes trace-level"},
		{name: "output-only column rejected", expr: "avg(trace.span_count)", wantErr: "unknown trace-level aggregation column"},
		{name: "unknown column rejected", expr: "avg(trace.bogus)", wantErr: "unknown trace-level aggregation column"},
		// a dotted column keeps every segment after the prefix, so it is reported whole
		{name: "multi segment column rejected by full name", expr: "avg(trace.service.name)", wantErr: `"trace.service.name"`},
		{name: "bare trace identifier is span-level", expr: "avg(trace)", isTrace: false},
		{name: "countIf over trace col rejected", expr: "countIf(trace.output_tokens > 1000)", wantErr: "not supported"},
		{name: "bare trace col rejected", expr: "trace.output_tokens", wantErr: "must be inside an aggregation function"},
		{name: "backquoted bare trace col rejected", expr: "`trace.output_tokens`", wantErr: "must be inside an aggregation function"},
		{name: "bare trace_id rejected", expr: "trace.trace_id", wantErr: "must be inside an aggregation function"},
		{name: "arithmetic outside an aggregation rejected", expr: "trace.output_tokens + trace.input_tokens", wantErr: "must be inside an aggregation function"},
		{name: "trace col beside an aggregation rejected", expr: "sum(trace.output_tokens) + trace.input_tokens", wantErr: "must be inside an aggregation function"},
		{name: "aggregation scaled by a constant", expr: "sum(trace.output_tokens) * 2", isTrace: true, want: "sum(output_tokens) * 2", used: []string{"output_tokens"}},
		{name: "rate over traces", expr: "rate(trace.trace_id)", isTrace: true, want: "count(trace_id)"},
		{name: "rate_sum trace col", expr: "rate_sum(trace.output_tokens)", isTrace: true, want: "sum(output_tokens)", used: []string{"output_tokens"}},
		// the interval divides the whole rendered expression, so a second aggregation
		// alongside a rate would be divided too
		{name: "rate mixed with another aggregation rejected", expr: "rate(trace.trace_id) + avg(trace.output_tokens)", wantErr: "combines a rate with another aggregation"},
		{name: "ratio of two rates rejected", expr: "rate_sum(trace.output_tokens)/rate_sum(trace.input_tokens)", wantErr: "combines a rate with another aggregation"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ta, isTrace, err := rewriteTraceAggregation(tc.expr, cols)
			if tc.wantErr != "" {
				require.ErrorContains(t, err, tc.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.isTrace, isTrace)
			if !tc.isTrace {
				return
			}
			assert.Equal(t, tc.want, ta.expr)
			for _, u := range tc.used {
				assert.Contains(t, ta.used, u)
			}
			assert.Len(t, ta.used, len(tc.used))
		})
	}
}
