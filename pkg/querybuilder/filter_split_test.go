package querybuilder

import (
	"strings"
	"testing"
)

func TestSplitFilterForAggregates(t *testing.T) {
	agg := map[string]struct{}{"completion_tokens": {}, "span_count": {}, "prompt_tokens": {}}

	cases := []struct {
		name       string
		query      string
		wantSpan   string // substring expected in span part ("" => span empty)
		wantHaving string // substring expected in having part ("" => having empty)
		wantErr    bool
	}{
		{"span only", "service.name = 'x'", "service.name = 'x'", "", false},
		{"agg only bare", "completion_tokens > 1000", "", "completion_tokens > 1000", false},
		{"agg only trace ctx", "trace.completion_tokens > 1000", "", "trace.completion_tokens > 1000", false},
		{"span AND agg", "service.name = 'x' AND completion_tokens > 1000", "service.name = 'x'", "completion_tokens > 1000", false},
		// the whitespace-preservation case: OR between two aggregates must keep spaces
		{"agg OR agg", "completion_tokens > 1000 OR span_count > 3", "", "completion_tokens > 1000 OR span_count > 3", false},
		{"span OR span", "service.name = 'x' OR kind_string = 'Internal'", "service.name = 'x' OR kind_string = 'Internal'", "", false},
		{"agg OR span rejected", "completion_tokens > 1000 OR service.name = 'x'", "", "", true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			span, having, err := SplitFilterForAggregates(tc.query, agg)
			if (err != nil) != tc.wantErr {
				t.Fatalf("query %q: err=%v wantErr=%v", tc.query, err, tc.wantErr)
			}
			if tc.wantErr {
				return
			}
			if tc.wantSpan == "" && span != "" {
				t.Errorf("query %q: expected empty span, got %q", tc.query, span)
			}
			if tc.wantSpan != "" && !strings.Contains(span, tc.wantSpan) {
				t.Errorf("query %q: span %q missing %q", tc.query, span, tc.wantSpan)
			}
			if tc.wantHaving == "" && having != "" {
				t.Errorf("query %q: expected empty having, got %q", tc.query, having)
			}
			if tc.wantHaving != "" && !strings.Contains(having, tc.wantHaving) {
				t.Errorf("query %q: having %q missing %q", tc.query, having, tc.wantHaving)
			}
		})
	}
}
