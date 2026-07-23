package source

import (
	"context"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/evidence"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/profile"
)

type Target struct {
	Service     string
	Environment string
	Start       time.Time
	End         time.Time
}

type TelemetrySource interface {
	Snapshot(context.Context, profile.Profile, Target) (evidence.Snapshot, error)
}

// MemorySource provides deterministic evidence for local development and
// tests. A SigNoz adapter will implement the same interface in Phase 1.
type MemorySource struct {
	Data evidence.Snapshot
}

func (s MemorySource) Snapshot(context.Context, profile.Profile, Target) (evidence.Snapshot, error) {
	return s.Data, nil
}
