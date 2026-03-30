package auditor

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
)

type Auditor interface {
	// Audit emits an audit event. It is fire-and-forget: callers never block on audit outcomes.
	Audit(ctx context.Context, event audittypes.AuditEvent)
}
