package auditor

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
)

var (
	ErrCodeAuditExportFailed = errors.MustNewCode("audit_export_failed")
)

type Auditor interface {
	factory.ServiceWithHealthy

	// Audit emits an audit event. It is fire-and-forget: callers never block on audit outcomes.
	Audit(ctx context.Context, event audittypes.AuditEvent)
}
