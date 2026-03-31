package audittypes

import (
	"encoding/hex"
	"fmt"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
)

// ToLogRecord populates a plog.LogRecord with all audit event fields:
// body, severity, event name, all signoz.audit.* attributes, and transport context attributes.
func (event AuditEvent) ToLogRecord(dest plog.LogRecord) {
	dest.SetTimestamp(pcommon.NewTimestampFromTime(event.Timestamp))
	dest.SetObservedTimestamp(pcommon.NewTimestampFromTime(event.Timestamp))
	dest.Body().SetStr(event.setBody())
	dest.SetEventName(event.EventName.String())
	dest.SetSeverityNumber(event.Outcome.Severity())
	dest.SetSeverityText(event.Outcome.SeverityText())

	if event.TraceID != "" {
		if tid, err := parseTraceID(event.TraceID); err == nil {
			dest.SetTraceID(tid)
		}
	}
	if event.SpanID != "" {
		if sid, err := parseSpanID(event.SpanID); err == nil {
			dest.SetSpanID(sid)
		}
	}

	attrs := dest.Attributes()

	// Principal attributes
	attrs.PutStr("signoz.audit.principal.id", event.PrincipalID)
	attrs.PutStr("signoz.audit.principal.email", event.PrincipalEmail)
	attrs.PutStr("signoz.audit.principal.type", event.PrincipalType.StringValue())
	attrs.PutStr("signoz.audit.principal.org_id", event.PrincipalOrgID)
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

func parseTraceID(s string) (pcommon.TraceID, error) {
	b, err := hex.DecodeString(s)
	if err != nil || len(b) != 16 {
		return pcommon.TraceID{}, fmt.Errorf("invalid trace id: %s", s)
	}
	var tid pcommon.TraceID
	copy(tid[:], b)
	return tid, nil
}

func parseSpanID(s string) (pcommon.SpanID, error) {
	b, err := hex.DecodeString(s)
	if err != nil || len(b) != 8 {
		return pcommon.SpanID{}, fmt.Errorf("invalid span id: %s", s)
	}
	var sid pcommon.SpanID
	copy(sid[:], b)
	return sid, nil
}
