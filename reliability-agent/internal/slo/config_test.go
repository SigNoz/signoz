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
	percentage := Definition{Name: "x", Type: SLITypeRatio, Target: 99, Window: "1h", GoodQuery: "good", TotalQuery: "total"}
	if err := percentage.Validate(); err != nil || percentage.NormalizedTarget() != 0.99 {
		t.Fatalf("percentage target did not normalize: err=%v target=%v", err, percentage.NormalizedTarget())
	}
	one := Definition{Name: "x", Type: SLITypeRatio, Target: 1, Window: "1h", GoodQuery: "good", TotalQuery: "total"}
	if err := one.Validate(); err != nil {
		t.Fatal(err)
	}
}
