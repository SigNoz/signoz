package slo

import (
	"strings"
	"testing"
)

func TestLatencyQueriesUseConfiguredWindow(t *testing.T) {
	cfg := Config{Service: "checkout-api", Environment: "test"}
	good, total, err := deriveQueries(cfg, Definition{
		Name: "latency", Type: SLITypeLatencyThreshold, Window: "30d",
		LatencyMetric: `request_duration_seconds{region="local"}`, ThresholdMS: 1000,
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, query := range []string{good, total} {
		if !strings.Contains(query, "[30d]") || strings.Contains(query, "WINDOW") {
			t.Fatalf("query does not use configured window: %s", query)
		}
		for _, selector := range []string{
			`service_name="checkout-api"`,
			`environment="test"`,
			`region="local"`,
		} {
			if !strings.Contains(query, selector) {
				t.Fatalf("query %q does not contain selector %q", query, selector)
			}
		}
	}
	if !strings.Contains(good, `request_duration_seconds_bucket{`) ||
		!strings.Contains(good, `le="1"`) {
		t.Fatalf("unexpected good latency query: %s", good)
	}
	if !strings.Contains(total, `request_duration_seconds_count{`) {
		t.Fatalf("unexpected total latency query: %s", total)
	}
}
