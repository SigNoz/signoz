package telemetryscopedtraces

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// rewriteTraceAggregation unit tests
// ---------------------------------------------------------------------------

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
		{name: "tracefield prefix", expr: "sum(tracefield.total_tokens)", isTrace: true, want: "sum(total_tokens)", used: []string{"total_tokens"}},
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
		{name: "countIf over trace col rejected", expr: "countIf(trace.output_tokens > 1000)", wantErr: "not supported"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ta, isTrace, err := rewriteTraceAggregation(tc.expr, cols)
			if tc.wantErr != "" {
				require.ErrorContains(t, err, tc.wantErr)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tc.isTrace, isTrace)
			if !tc.isTrace {
				return
			}
			require.Equal(t, tc.want, ta.expr)
			for _, u := range tc.used {
				require.Contains(t, ta.used, u)
			}
			require.Len(t, ta.used, len(tc.used))
		})
	}
}
