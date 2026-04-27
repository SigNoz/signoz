package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

// Option configures optional behaviour on a handler created by New.
type Option func(*handler)

type AuditDef struct {
	ResourceKind    coretypes.Kind            //  Typeable.Kind() value, e.g. "dashboard", "user".
	Action          coretypes.Verb            // create, update, delete, etc.
	Category        audittypes.ActionCategory // access_control, configuration_change, etc.
	ResourceIDParam string                    // Gorilla mux path param name for the resource ID.
}

// WithAudit attaches an AuditDef to the handler. The actual audit event
// emission is handled by the middleware layer, which reads the AuditDef
// from the matched route's handler.
func WithAuditDef(def AuditDef) Option {
	return func(h *handler) {
		h.auditDef = &def
	}
}
