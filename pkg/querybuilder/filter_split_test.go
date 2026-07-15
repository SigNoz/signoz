package querybuilder

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSplitFilterForAggregates(t *testing.T) {
	agg := map[string]struct{}{"completion_tokens": {}, "span_count": {}, "prompt_tokens": {}}

	type tc struct {
		name    string
		query   string
		span    string // expected span-level (WHERE) part; "" => empty
		having  string // expected trace-level (HAVING) part; "" => empty
		wantErr bool
	}

	cases := []tc{
		// --- empty input ---------------------------------------------------------
		{
			name: "empty",
		},
		{
			name:  "whitespace only",
			query: "   ",
		},

		// --- single class --------------------------------------------------------
		{
			name:  "span only",
			query: "service.name = 'x'",
			span:  "service.name = 'x'",
		},
		{
			name:   "agg only bare",
			query:  "completion_tokens > 1000",
			having: "completion_tokens > 1000",
		},
		{
			// the user-facing `trace.` prefix marks a trace-level aggregate.
			name:   "agg only trace prefix",
			query:  "trace.completion_tokens > 1000",
			having: "trace.completion_tokens > 1000",
		},
		{
			// an unknown name under the trace context still routes trace-level, so the
			// aggregate validation rejects it with a targeted error instead of the span
			// path failing on an unknown field.
			name:   "unknown aggregate under trace context stays trace-level",
			query:  "trace.not_an_aggregate > 1000",
			having: "trace.not_an_aggregate > 1000",
		},

		{
			// ANTLR token offsets are rune indices; slicing must not shift after a
			// multi-byte char (this used to truncate 1000 → 100).
			name:   "unicode value before the split",
			query:  "service.name = 'héllo' AND completion_tokens > 1000",
			span:   "service.name = 'héllo'",
			having: "completion_tokens > 1000",
		},

		// --- top-level AND splits across the two buckets -------------------------
		{
			name:   "span AND agg",
			query:  "service.name = 'x' AND completion_tokens > 1000",
			span:   "service.name = 'x'",
			having: "completion_tokens > 1000",
		},
		{
			// order within a bucket is preserved; the two span atoms join with AND.
			name:   "span AND span AND agg",
			query:  "service.name = 'x' AND kind_string = 'Internal' AND completion_tokens > 1000",
			span:   "service.name = 'x' AND kind_string = 'Internal'",
			having: "completion_tokens > 1000",
		},
		{
			// a parenthesized top-level AND still splits across the two buckets.
			name:   "parenthesized span AND agg",
			query:  "(service.name = 'x' AND completion_tokens > 1000)",
			span:   "service.name = 'x'",
			having: "completion_tokens > 1000",
		},

		// --- OR groups are re-wrapped in parens so a later AND-join can't invert
		//     precedence (`a AND (b OR c)` must not flatten to `a AND b OR c`) ------
		{
			name:   "agg OR agg",
			query:  "completion_tokens > 1000 OR span_count > 3",
			having: "(completion_tokens > 1000 OR span_count > 3)",
		},
		{
			name:  "span OR span",
			query: "service.name = 'x' OR kind_string = 'Internal'",
			span:  "(service.name = 'x' OR kind_string = 'Internal')",
		},
		{
			name:  "span AND (span OR span)",
			query: "service.name = 'x' AND (kind_string = 'Internal' OR kind_string = 'Client')",
			span:  "service.name = 'x' AND (kind_string = 'Internal' OR kind_string = 'Client')",
		},
		{
			name:   "agg AND (agg OR agg)",
			query:  "prompt_tokens > 5 AND (completion_tokens > 1000 OR span_count > 3)",
			having: "prompt_tokens > 5 AND (completion_tokens > 1000 OR span_count > 3)",
		},
		{
			// the OR group routes to span, the trailing aggregate to having.
			name:   "span AND (span OR span) AND agg",
			query:  "a.b = 'x' AND (c.d = 'y' OR e.f = 'z') AND completion_tokens > 1000",
			span:   "a.b = 'x' AND (c.d = 'y' OR e.f = 'z')",
			having: "completion_tokens > 1000",
		},

		// --- a nested AND group flattens across the buckets (no spurious parens) --
		{
			name:   "(span AND agg) AND agg",
			query:  "(service.name = 'x' AND completion_tokens > 1000) AND prompt_tokens > 5",
			span:   "service.name = 'x'",
			having: "completion_tokens > 1000 AND prompt_tokens > 5",
		},

		// --- NOT wrapping a single-class group is routed whole to that class ------
		{
			name:   "not agg",
			query:  "NOT (completion_tokens > 1000)",
			having: "NOT (completion_tokens > 1000)",
		},
		{
			name:  "not span",
			query: "NOT (service.name = 'x')",
			span:  "NOT (service.name = 'x')",
		},

		// --- class-mixing is rejected in an OR group, a NOT group, or a nested OR -
		{
			name:    "agg OR span rejected",
			query:   "completion_tokens > 1000 OR service.name = 'x'",
			wantErr: true,
		},
		{
			name:    "not mixed rejected",
			query:   "NOT (completion_tokens > 1000 AND service.name = 'x')",
			wantErr: true,
		},
		{
			name:    "span AND (agg OR span) rejected",
			query:   "service.name = 'x' AND (completion_tokens > 1000 OR kind_string = 'Client')",
			wantErr: true,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			span, having, err := SplitFilterForAggregates(c.query, agg)
			if c.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, c.span, span, "span part")
			require.Equal(t, c.having, having, "having part")
		})
	}
}
