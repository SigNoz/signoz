package slo

import (
	"strings"
	"testing"
)

func TestLatencyQueriesUseConfiguredWindow(t *testing.T) {
	good, total, err := deriveQueries(Definition{
		Name: "latency", Type: SLITypeLatencyThreshold, Window: "30d",
		LatencyMetric: "request_duration_seconds", ThresholdMS: 1000,
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, query := range []string{good, total} {
		if !strings.Contains(query, "[30d]") || strings.Contains(query, "WINDOW") {
			t.Fatalf("query does not use configured window: %s", query)
		}
	}
}
