package auditortypes

import (
	"time"
)

// AuditEvent represents a single audit log event.
type AuditEvent struct {
	// Principal (Who)
	PrincipalID       string `json:"principalId"`
	PrincipalEmail    string `json:"principalEmail"`
	PrincipalType     PrincipalType `json:"principalType"`
	PrincipalOrgID    string `json:"principalOrgId"`
	IdentNProvider    string `json:"identnProvider,omitempty"`

	// Action (What)
	Action         Action         `json:"action"`
	ActionCategory ActionCategory `json:"actionCategory"`
	Outcome        Outcome        `json:"outcome"`

	// Resource (On What)
	ResourceName string `json:"resourceName"`
	ResourceID   string `json:"resourceId,omitempty"`

	// Error (When outcome is failure)
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

	// Body template for human-readable message
	Body string `json:"body"`

	// Event identification
	EventName string `json:"eventName"`
	Timestamp time.Time `json:"timestamp"`

	// Trace correlation
	TraceID string `json:"traceId,omitempty"`
	SpanID  string `json:"spanId,omitempty"`
}
