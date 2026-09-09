package slo

import (
	"math"
	"testing"
)

func TestBudgetAndBurnRate(t *testing.T) {
	if math.Abs(BurnRate(0.005, 0.995)-1) > 1e-9 {
		t.Fatalf("expected burn rate 1")
	}
	if math.Abs(RemainingBudget(0.005, 0.995)) > 1e-9 {
		t.Fatalf("expected exhausted budget")
	}
	if RemainingBudget(0, 1) != 1 || RemainingBudget(0.01, 1) != -math.MaxFloat64 {
		t.Fatalf("unexpected 100%% target behavior")
	}
	if remaining := RemainingBudget(0.1, 0.99); remaining >= 0 {
		t.Fatalf("expected overspent budget to remain negative, got %v", remaining)
	}
	if burn := BurnRate(0.01, 1); math.IsInf(burn, 0) || math.IsNaN(burn) {
		t.Fatalf("100%% target burn rate must remain JSON-safe, got %v", burn)
	}
}
