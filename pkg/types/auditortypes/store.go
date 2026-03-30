package auditortypes

import "context"

// Store is the minimal interface for emitting audit events.
type Store interface {
	Emit(ctx context.Context, event AuditEvent) error
}
