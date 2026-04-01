package audittypes

import (
	"encoding/hex"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
	semconv "go.opentelemetry.io/otel/semconv/v1.10.0"
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
	PrincipalID    valuer.UUID   `json:"principalId"`
	PrincipalEmail valuer.Email  `json:"principalEmail"`
	PrincipalType  PrincipalType `json:"principalType"`
	PrincipalOrgID valuer.UUID   `json:"principalOrgId"`
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

func NewPLogsFromAuditEvents(events []AuditEvent, name string, version string, scope string) plog.Logs {
	logs := plog.NewLogs()

	resourceLogs := logs.ResourceLogs().AppendEmpty()
	resourceLogs.Resource().Attributes().PutStr(string(semconv.ServiceNameKey), name)
	resourceLogs.Resource().Attributes().PutStr(string(semconv.ServiceVersionKey), version)
	scopeLogs := resourceLogs.ScopeLogs().AppendEmpty()
	scopeLogs.Scope().SetName(scope)

	for i := range events {
		events[i].ToLogRecord(scopeLogs.LogRecords().AppendEmpty())
	}

	return logs
}

func (event AuditEvent) ToLogRecord(dest plog.LogRecord) {
	dest.SetTimestamp(pcommon.NewTimestampFromTime(event.Timestamp))
	dest.SetObservedTimestamp(pcommon.NewTimestampFromTime(event.Timestamp))
	dest.Body().SetStr(event.setBody())
	dest.SetEventName(event.EventName.String())
	dest.SetSeverityNumber(event.Outcome.Severity())
	dest.SetSeverityText(event.Outcome.SeverityText())

	if tid, ok := parseTraceID(event.TraceID); ok {
		dest.SetTraceID(tid)
	}
	if sid, ok := parseSpanID(event.SpanID); ok {
		dest.SetSpanID(sid)
	}

	attrs := dest.Attributes()

	// Principal attributes
	attrs.PutStr("signoz.audit.principal.id", event.PrincipalID.StringValue())
	attrs.PutStr("signoz.audit.principal.email", event.PrincipalEmail.String())
	attrs.PutStr("signoz.audit.principal.type", event.PrincipalType.StringValue())
	attrs.PutStr("signoz.audit.principal.org_id", event.PrincipalOrgID.StringValue())
	putStrIfNotEmpty(attrs, "signoz.audit.identn_provider", event.IdentNProvider)

	// Action attributes
	attrs.PutStr("signoz.audit.action", event.Action.StringValue())
	attrs.PutStr("signoz.audit.action_category", event.ActionCategory.StringValue())
	attrs.PutStr("signoz.audit.outcome", event.Outcome.StringValue())

	// Resource attributes
	attrs.PutStr("signoz.audit.resource.name", event.ResourceName)
	putStrIfNotEmpty(attrs, "signoz.audit.resource.id", event.ResourceID)

	// Error attributes (on failure)
	putStrIfNotEmpty(attrs, "signoz.audit.error.type", event.ErrorType)
	putStrIfNotEmpty(attrs, "signoz.audit.error.code", event.ErrorCode)
	putStrIfNotEmpty(attrs, "signoz.audit.error.message", event.ErrorMessage)

	// Transport context attributes
	putStrIfNotEmpty(attrs, "http.request.method", event.HTTPMethod)
	putStrIfNotEmpty(attrs, "http.route", event.HTTPRoute)
	if event.HTTPStatusCode != 0 {
		attrs.PutInt("http.response.status_code", int64(event.HTTPStatusCode))
	}
	putStrIfNotEmpty(attrs, "url.path", event.URLPath)
	putStrIfNotEmpty(attrs, "client.address", event.ClientAddress)
	putStrIfNotEmpty(attrs, "user_agent.original", event.UserAgent)
}

func (event AuditEvent) setBody() string {
	if event.Outcome == OutcomeSuccess {
		return fmt.Sprintf("%s (%s) %s %s %s", event.PrincipalEmail, event.PrincipalID, event.Action.PastTense(), event.ResourceName, event.ResourceID)
	}

	return fmt.Sprintf("%s (%s) failed to %s %s %s: %s (%s)", event.PrincipalEmail, event.PrincipalID, event.Action.StringValue(), event.ResourceName, event.ResourceID, event.ErrorType, event.ErrorCode)
}

func putStrIfNotEmpty(attrs pcommon.Map, key, value string) {
	if value != "" {
		attrs.PutStr(key, value)
	}
}

func parseTraceID(s string) (pcommon.TraceID, bool) {
	b, err := hex.DecodeString(s)
	if err != nil || len(b) != 16 {
		return pcommon.TraceID{}, false
	}

	var tid pcommon.TraceID
	copy(tid[:], b)

	return tid, true
}

func parseSpanID(s string) (pcommon.SpanID, bool) {
	b, err := hex.DecodeString(s)
	if err != nil || len(b) != 8 {
		return pcommon.SpanID{}, false
	}

	var sid pcommon.SpanID
	copy(sid[:], b)

	return sid, true
}
