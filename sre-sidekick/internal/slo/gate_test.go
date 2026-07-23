package slo

import (
	"context"
	"strings"
	"testing"
	"time"
)

type captureScalar struct {
	Expression string
}

func (c *captureScalar) Scalar(_ context.Context, expression string, _, _ uint64) (float64, error) {
	c.Expression = expression
	return 1, nil
}

func TestMetricPresenceGateScopesServiceAndEnvironment(t *testing.T) {
	querier := &captureScalar{}
	gate := NewMetricPresenceGate(querier, nil)
	gate.Now = func() time.Time { return time.Date(2026, 7, 22, 12, 0, 0, 0, time.UTC) }
	result, err := gate.Check(context.Background(), GateRequest{
		Service:      "checkout-api",
		Environment:  "test",
		Window:       time.Hour,
		Dependencies: []string{"requests{region=\"local\"}"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !result.Trusted || result.Coverage != 1 {
		t.Fatalf("unexpected gate result: %+v", result)
	}
	for _, expected := range []string{"service_name=\"checkout-api\"", "environment=\"test\"", "region=\"local\""} {
		if !strings.Contains(querier.Expression, expected) {
			t.Fatalf("scoped expression %q does not contain %q", querier.Expression, expected)
		}
	}
	if !strings.Contains(querier.Expression, "count_over_time(") ||
		!strings.Contains(querier.Expression, "[3600s]") {
		t.Fatalf("presence query does not cover the requested window: %q", querier.Expression)
	}
}
