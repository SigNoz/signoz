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
	Timestamp time.Time

	// OTel LogRecord Intrinsic
	TraceID oteltrace.TraceID

	// OTel LogRecord Intrinsic
	SpanID oteltrace.SpanID

	// OTel LogRecord Intrinsic
	Body string

	// OTel LogRecord Intrinsic
	EventName EventName

	// Custom Audit Attributes - Action
	AuditAttributes AuditAttributes

	// Custom Audit Attributes - Principal
	PrincipalAttributes PrincipalAttributes

	// Custom Audit Attributes - Resource
	ResourceAttributes ResourceAttributes

	// Custom Audit Attributes - Error
	ErrorAttributes ErrorAttributes

	// Custom Audit Attributes - Transport Context
	TransportAttributes TransportAttributes
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
) AuditEvent {
	auditAttributes := NewAuditAttributesFromHTTP(statusCode, action, actionCategory, claims)
	principalAttributes := NewPrincipalAttributesFromClaims(claims)
	resourceAttributes := NewResourceAttributes(resourceID, resourceName)
	errorAttributes := NewErrorAttributes(errorType, errorCode)
	transportAttributes := NewTransportAttributesFromHTTP(req, route, statusCode)

	return AuditEvent{
		Timestamp:           time.Now(),
		TraceID:             traceID,
		SpanID:              spanID,
		Body:                newBody(auditAttributes, principalAttributes, resourceAttributes, errorAttributes),
		EventName:           NewEventName(resourceAttributes.ResourceName, auditAttributes.Action),
		AuditAttributes:     auditAttributes,
		PrincipalAttributes: principalAttributes,
		ResourceAttributes:  resourceAttributes,
		ErrorAttributes:     errorAttributes,
		TransportAttributes: transportAttributes,
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
	dest.SetSeverityNumber(event.AuditAttributes.Outcome.Severity())
	dest.SetSeverityText(event.AuditAttributes.Outcome.SeverityText())

	// Set trace and span IDs if present
	if event.TraceID.IsValid() {
		dest.SetTraceID(pcommon.TraceID(event.TraceID))
	}

	if event.SpanID.IsValid() {
		dest.SetSpanID(pcommon.SpanID(event.SpanID))
	}

	attrs := dest.Attributes()

	// Audit attributes
	event.AuditAttributes.Put(attrs)

	// Principal attributes
	event.PrincipalAttributes.Put(attrs)

	// Resource attributes
	event.ResourceAttributes.Put(attrs)

	// Error attributes
	event.ErrorAttributes.Put(attrs)

	// Transport context attributes
	event.TransportAttributes.Put(attrs)
}
