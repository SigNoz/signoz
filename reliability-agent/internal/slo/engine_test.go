package slo

import (
	"context"
	"errors"
	"math"
	"testing"
	"time"
)

type fakeScalar struct {
	Values map[string]float64
	Errors map[string]error
}

func (f fakeScalar) Scalar(_ context.Context, expression string, _, _ uint64) (float64, error) {
	if err := f.Errors[expression]; err != nil {
		return 0, err
	}
	value, ok := f.Values[expression]
	if !ok {
		return 0, errors.New("missing fake query: " + expression)
	}
	return value, nil
}

type fakeGate struct {
	Result GateResult
}

func (f fakeGate) Check(context.Context, string, string, time.Duration, []string) (GateResult, error) {
	return f.Result, nil
}

func TestEngineHealthyAndUnhealthy(t *testing.T) {
	query := fakeScalar{Values: map[string]float64{"good": 995, "total": 1000}}
	engine := NewEngine(query, nil)
	engine.Now = func() time.Time { return time.Date(2026, 7, 22, 12, 0, 0, 0, time.UTC) }
	cfg := Config{Service: "checkout-api", Environment: "test", SLOs: []Definition{{
		Name: "success", Type: SLITypeRatio, Target: 0.995, Window: "1h",
		GoodQuery: "good", TotalQuery: "total",
	}}}
	reports, err := engine.Evaluate(context.Background(), cfg, time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	if reports[0].State != StateHealthy || math.Abs(reports[0].SLI-0.995) > 1e-9 || math.Abs(reports[0].BurnRate-1) > 1e-9 {
		t.Fatalf("unexpected healthy report: %+v", reports[0])
	}

	query.Values["good"] = 800
	reports, err = engine.Evaluate(context.Background(), cfg, time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	if reports[0].State != StateUnhealthy || math.Abs(reports[0].SLI-0.8) > 1e-9 {
		t.Fatalf("unexpected unhealthy report: %+v", reports[0])
	}
}

func TestEngineCompletenessFailureIsIndeterminate(t *testing.T) {
	query := fakeScalar{Values: map[string]float64{"good": 995, "total": 1000}}
	engine := NewEngine(query, fakeGate{Result: GateResult{
		Coverage: 0.5, QueryComplete: true, Trusted: false, Reason: "missing dependency",
	}})
	cfg := Config{Service: "checkout-api", Environment: "test", SLOs: []Definition{{
		Name: "success", Type: SLITypeRatio, Target: 0.99, Window: "1h",
		GoodQuery: "good", TotalQuery: "total", RequiresCompleteness: true,
		Dependencies: []string{"requests"},
	}}}
	reports, err := engine.Evaluate(context.Background(), cfg, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if reports[0].State != StateIndeterminate || reports[0].SLI != 0 {
		t.Fatalf("expected indeterminate report: %+v", reports[0])
	}
}

func TestEngineNoDataIsIndeterminate(t *testing.T) {
	engine := NewEngine(fakeScalar{Values: map[string]float64{"total": 0}}, nil)
	cfg := Config{Service: "checkout-api", SLOs: []Definition{{
		Name: "success", Type: SLITypeRatio, Target: 0.99, Window: "1h",
		GoodQuery: "good", TotalQuery: "total",
	}}}
	reports, err := engine.Evaluate(context.Background(), cfg, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if reports[0].State != StateIndeterminate || reports[0].Error == "" {
		t.Fatalf("expected no-data indeterminate report: %+v", reports[0])
	}
}
