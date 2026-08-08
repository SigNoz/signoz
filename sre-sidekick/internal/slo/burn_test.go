package slo

import (
	"context"
	"strings"
	"testing"
	"time"
)

type burnScalar struct{}

func (burnScalar) Scalar(_ context.Context, query string, _, _ uint64) (float64, error) {
	if strings.Contains(query, "good_total") {
		return 80, nil
	}
	return 100, nil
}

func TestEvaluateMultiWindowBurnUsesBothTierWindows(t *testing.T) {
	cfg := Config{Service: "checkout-api", Environment: "test", SLOs: []Definition{{
		Name: "success", Type: SLITypeRatio, Target: 0.99, Window: "30d",
		GoodQuery:  `increase(good_total{service_name="checkout-api",environment="test"}[30d])`,
		TotalQuery: `increase(total_total{service_name="checkout-api",environment="test"}[30d])`,
	}}}
	engine := NewEngine(burnScalar{}, nil)
	results, err := engine.EvaluateMultiWindow(context.Background(), cfg, time.Now(), []BurnTier{{
		Name: "fast", LongWindow: "1h", ShortWindow: "5m", Threshold: 1, Severity: "page",
	}})
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 1 || !results[0].Firing || results[0].LongBurn <= 1 || results[0].ShortBurn <= 1 {
		t.Fatalf("unexpected multi-window result: %+v", results)
	}
}
