package audittypes

import (
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	oteltrace "go.opentelemetry.io/otel/trace"
)

type AuditEvent struct {
	// OTel LogRecord Intrinsic
	Timestamp time.Time `json:"timestamp"`

	// OTel LogRecord Intrinsic
	TraceID oteltrace.TraceID `json:"traceId,omitempty"`

	// OTel LogRecord Intrinsic
	SpanID oteltrace.SpanID `json:"spanId,omitempty"`

	// OTel LogRecord Intrinsic
	Body string `json:"body"`

	// OTel LogRecord Intrinsic
	EventName EventName `json:"eventName"`

	// Custom Audit Attributes - Action
	AuditEventAuditAttributes AuditEventAuditAttributes `json:"auditAttributes"`

	// Custom Audit Attributes - Principal
	AuditEventPrincipalAttributes AuditEventPrincipalAttributes `json:"principalAttributes,omitempty"`

	// Custom Audit Attributes - Resource
	AuditEventResourceAttributes AuditEventResourceAttributes `json:"resourceAttributes,omitempty"`

	// Custom Audit Attributes - Error
	AuditEventErrorAttributes AuditEventErrorAttributes `json:"errorAttributes,omitempty"`

	// Custom Audit Attributes - Transport Context
	AuditEventTransportAttributes AuditEventTransportAttributes `json:"transportAttributes,omitempty"`
}

func NewAuditEventFromHTTPRequest(
	req *http.Request,
	route string,
	statusCode int,
	traceID oteltrace.TraceID,
	spanID oteltrace.SpanID,
	action Action,
	actionCategory ActionCategory,
	claims authtypes.Claims,
	resourceID string,
	resourceName string,
	errorType string,
	errorCode string,
	errorMessage string,
) AuditEvent {
	auditAttributes := NewAuditEventAuditAttributesFromHTTP(statusCode, action, actionCategory, claims)
	principalAttributes := NewAuditEventPrincipalAttributesFromClaims(claims)
	resourceAttributes := NewAuditEventResourceAttributes(resourceID, resourceName)
	errorAttributes := NewAuditEventErrorAttributes(errorType, errorCode, errorMessage)
	transportAttributes := NewAuditEventTransportAttributesFromHTTP(req, route, statusCode)

	return AuditEvent{
		Timestamp:                     time.Now(),
		TraceID:                       traceID,
		SpanID:                        spanID,
		Body:                          newBody(auditAttributes, principalAttributes, resourceAttributes, errorAttributes),
		EventName:                     NewEventName(resourceAttributes.ResourceName, auditAttributes.Action),
		AuditEventAuditAttributes:     auditAttributes,
		AuditEventPrincipalAttributes: principalAttributes,
		AuditEventResourceAttributes:  resourceAttributes,
		AuditEventErrorAttributes:     errorAttributes,
		AuditEventTransportAttributes: transportAttributes,
	}
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
	// Set timestamps
	dest.SetTimestamp(pcommon.NewTimestampFromTime(event.Timestamp))
	dest.SetObservedTimestamp(pcommon.NewTimestampFromTime(event.Timestamp))

	// Set body and event name
	dest.Body().SetStr(event.Body)
	dest.SetEventName(event.EventName.String())

	// Set severity based on outcome
	dest.SetSeverityNumber(event.AuditEventAuditAttributes.Outcome.Severity())
	dest.SetSeverityText(event.AuditEventAuditAttributes.Outcome.SeverityText())

	// Set trace and span IDs if present
	if event.TraceID.IsValid() {
		dest.SetTraceID(pcommon.TraceID(event.TraceID))
	}

	if event.SpanID.IsValid() {
		dest.SetSpanID(pcommon.SpanID(event.SpanID))
	}

	attrs := dest.Attributes()

	// Audit attributes
	event.AuditEventAuditAttributes.Put(attrs)

	// Principal attributes
	event.AuditEventPrincipalAttributes.Put(attrs)

	// Resource attributes
	event.AuditEventResourceAttributes.Put(attrs)

	// Error attributes
	event.AuditEventErrorAttributes.Put(attrs)

	// Transport context attributes
	event.AuditEventTransportAttributes.Put(attrs)
}
