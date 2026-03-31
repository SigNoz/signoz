package audittypes

import (
	"fmt"

	otellog "go.opentelemetry.io/otel/log"
	sdklog "go.opentelemetry.io/otel/sdk/log"
)

// ToLogRecord converts an AuditEvent into a complete OTel SDK log Record
// with body, severity, all signoz.audit.* attributes, and transport context attributes.
func (event AuditEvent) ToLogRecord() sdklog.Record {
	var record sdklog.Record

	record.SetTimestamp(event.Timestamp)
	record.SetBody(otellog.StringValue(event.setBody()))
	record.SetEventName(event.EventName.String())
	record.SetSeverity(event.Outcome.Severity())
	record.SetSeverityText(event.Outcome.SeverityText())

	attrs := make([]otellog.KeyValue, 0, 20)

	// Principal attributes
	attrs = append(attrs,
		otellog.String("signoz.audit.principal.id", event.PrincipalID),
		otellog.String("signoz.audit.principal.email", event.PrincipalEmail),
		otellog.String("signoz.audit.principal.type", event.PrincipalType.StringValue()),
		otellog.String("signoz.audit.principal.org_id", event.PrincipalOrgID),
	)
	attrs = appendStringIfNotEmpty(attrs, "signoz.audit.identn_provider", event.IdentNProvider)

	// Action attributes
	attrs = append(attrs,
		otellog.String("signoz.audit.action", event.Action.StringValue()),
		otellog.String("signoz.audit.action_category", event.ActionCategory.StringValue()),
		otellog.String("signoz.audit.outcome", event.Outcome.StringValue()),
	)

	// Resource attributes
	attrs = append(attrs, otellog.String("signoz.audit.resource.name", event.ResourceName))
	attrs = appendStringIfNotEmpty(attrs, "signoz.audit.resource.id", event.ResourceID)

	// Error attributes (on failure)
	attrs = appendStringIfNotEmpty(attrs, "signoz.audit.error.type", event.ErrorType)
	attrs = appendStringIfNotEmpty(attrs, "signoz.audit.error.code", event.ErrorCode)
	attrs = appendStringIfNotEmpty(attrs, "signoz.audit.error.message", event.ErrorMessage)

	// Transport context attributes
	attrs = appendStringIfNotEmpty(attrs, "http.request.method", event.HTTPMethod)
	attrs = appendStringIfNotEmpty(attrs, "http.route", event.HTTPRoute)
	if event.HTTPStatusCode != 0 {
		attrs = append(attrs, otellog.Int("http.response.status_code", event.HTTPStatusCode))
	}
	attrs = appendStringIfNotEmpty(attrs, "url.path", event.URLPath)
	attrs = appendStringIfNotEmpty(attrs, "client.address", event.ClientAddress)
	attrs = appendStringIfNotEmpty(attrs, "user_agent.original", event.UserAgent)

	record.AddAttributes(attrs...)
	return record
}

func (event AuditEvent) setBody() string {
	if event.Outcome == OutcomeSuccess {
		return fmt.Sprintf("%s (%s) %s %s %s", event.PrincipalEmail, event.PrincipalID, event.Action.PastTense(), event.ResourceName, event.ResourceID)
	}

	return fmt.Sprintf("%s (%s) failed to %s %s %s: %s (%s)", event.PrincipalEmail, event.PrincipalID, event.Action.StringValue(), event.ResourceName, event.ResourceID, event.ErrorType, event.ErrorCode)
}

func appendStringIfNotEmpty(attrs []otellog.KeyValue, key, value string) []otellog.KeyValue {
	if value != "" {
		return append(attrs, otellog.String(key, value))
	}
	return attrs
}
