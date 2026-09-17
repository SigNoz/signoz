package slo

import (
	"path/filepath"
	"runtime"
	"testing"
)

func TestExampleSLOConfigsLoad(t *testing.T) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("could not locate test file")
	}
	examples := filepath.Join(filepath.Dir(filename), "..", "..", "examples")
	for _, name := range []string{"checkout-slo.yaml", "support-agent-slo.yaml"} {
		if _, err := LoadConfig(filepath.Join(examples, name)); err != nil {
			t.Fatalf("load example %s: %v", name, err)
		}
	}
}

func TestTargetPercentageAndOneHundredPercent(t *testing.T) {
	percentage := Definition{
		Name: "x", Type: SLITypeRatio, Target: 99, Window: "1h",
		GoodQuery: "increase(good[1h])", TotalQuery: "increase(total[1h])",
	}
	if err := percentage.Validate(); err != nil || percentage.NormalizedTarget() != 0.99 {
		t.Fatalf("percentage target did not normalize: err=%v target=%v", err, percentage.NormalizedTarget())
	}
	one := Definition{
		Name: "x", Type: SLITypeRatio, Target: 1, Window: "1h",
		GoodQuery: "increase(good[1h])", TotalQuery: "increase(total[1h])",
	}
	if err := one.Validate(); err != nil {
		t.Fatal(err)
	}
}

func TestRatioQueriesMustUseConfiguredWindow(t *testing.T) {
	definition := Definition{
		Name: "x", Type: SLITypeRatio, Target: 0.99, Window: "30d",
		GoodQuery: "sum(good_total)", TotalQuery: "increase(total[5m])",
	}
	if err := definition.Validate(); err == nil {
		t.Fatal("expected unsafe counter queries to be rejected")
	}
}

func TestConfigRejectsUnscopedRatioQueries(t *testing.T) {
	cfg := Config{
		Service: "checkout-api", Environment: "test",
		SLOs: []Definition{{
			Name: "x", Type: SLITypeRatio, Target: 0.99, Window: "1h",
			GoodQuery: "increase(good[1h])", TotalQuery: "increase(total[1h])",
		}},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected unscoped ratio queries to be rejected")
	}
}
