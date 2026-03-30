package auditor

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
)

// Auditor is the contract between the HTTP handler layer and the audit
// implementation. Community uses a noop; enterprise uses a buffered
// OTLP HTTP exporter gated by licensing.
//
// Audit is fire-and-forget: callers never block on audit outcomes.
type Auditor interface {
	Audit(ctx context.Context, event audittypes.AuditEvent)
}
