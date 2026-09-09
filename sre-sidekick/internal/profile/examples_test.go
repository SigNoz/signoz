package profile

import (
	"path/filepath"
	"runtime"
	"testing"
)

func TestExampleProfilesLoad(t *testing.T) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("could not locate test file")
	}
	examples := filepath.Join(filepath.Dir(filename), "..", "..", "examples")
	for _, name := range []string{"checkout-api.yaml", "support-agent.yaml"} {
		if _, err := LoadFile(filepath.Join(examples, name)); err != nil {
			t.Fatalf("load example %s: %v", name, err)
		}
	}
}
