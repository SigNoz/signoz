package auditortypes

import (
	"context"
	"time"
)

// AuditEvent represents a single audit log event.
// Fields are ordered following the OTel LogRecord structure.
type AuditEvent struct {
	// OTel LogRecord intrinsic fields
	Timestamp time.Time `json:"timestamp"`
	TraceID   string    `json:"traceId,omitempty"`
	SpanID    string    `json:"spanId,omitempty"`
	Body      string    `json:"body"`
	EventName EventName `json:"eventName"`

	// Audit attributes — Principal (Who)
	PrincipalID    string        `json:"principalId"`
	PrincipalEmail string        `json:"principalEmail"`
	PrincipalType  PrincipalType `json:"principalType"`
	PrincipalOrgID string        `json:"principalOrgId"`
	IdentNProvider string        `json:"identnProvider,omitempty"`

	// Audit attributes — Action (What)
	Action         Action         `json:"action"`
	ActionCategory ActionCategory `json:"actionCategory"`
	Outcome        Outcome        `json:"outcome"`

	// Audit attributes — Resource (On What)
	ResourceName string `json:"resourceName"`
	ResourceID   string `json:"resourceId,omitempty"`

	// Audit attributes — Error (When outcome is failure)
	ErrorType    string `json:"errorType,omitempty"`
	ErrorCode    string `json:"errorCode,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`

	// Transport Context (Where/How)
	HTTPMethod     string `json:"httpMethod,omitempty"`
	HTTPRoute      string `json:"httpRoute,omitempty"`
	HTTPStatusCode int    `json:"httpStatusCode,omitempty"`
	URLPath        string `json:"urlPath,omitempty"`
	ClientAddress  string `json:"clientAddress,omitempty"`
	UserAgent      string `json:"userAgent,omitempty"`
}

// Store is the minimal interface for emitting audit events.
type Store interface {
	Emit(ctx context.Context, event AuditEvent) error
}
