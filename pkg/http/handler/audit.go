package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
)

// AuditDef declares audit instrumentation for a handler. When set alongside
// an OpenAPIDef, the middleware layer automatically emits an audit event after
// every request via auditor.Audit().
type AuditDef struct {
	ResourceName    string                    // AuthZ Typeable.Name() value, e.g. "dashboard", "user".
	Action          audittypes.Action         // create, update, delete, login, etc.
	Category        audittypes.ActionCategory // access_control, configuration_change, etc.
	ResourceIDParam string                    // Gorilla mux path param name for the resource ID.
}

// Option configures optional behaviour on a handler created by New.
type Option func(*handler)

// WithAudit attaches an AuditDef to the handler. The actual audit event
// emission is handled by the middleware layer, which reads the AuditDef
// from the matched route's handler.
func WithAudit(def AuditDef) Option {
	return func(h *handler) {
		h.auditDef = &def
	}
}

// AuditDefProvider is implemented by handlers that carry an AuditDef.
// The middleware layer uses this to discover whether a matched route
// should emit audit events.
type AuditDefProvider interface {
	AuditDef() *AuditDef
}

// AuditDef returns the audit definition for this handler, or nil if
// audit is not configured.
func (handler *handler) AuditDef() *AuditDef {
	return handler.auditDef
}
