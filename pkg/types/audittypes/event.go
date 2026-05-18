package audittypes

import (
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
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
	action coretypes.Verb,
	actionCategory ActionCategory,
	claims authtypes.Claims,
	resourceID string,
	resourceKind coretypes.Kind,
	errorType string,
	errorCode string,
) AuditEvent {
	auditAttributes := NewAuditAttributesFromHTTP(statusCode, action, actionCategory, claims)
	principalAttributes := NewPrincipalAttributesFromClaims(claims)
	resourceAttributes := NewResourceAttributes(resourceID, resourceKind)
	errorAttributes := NewErrorAttributes(errorType, errorCode)
	transportAttributes := NewTransportAttributesFromHTTP(req, route, statusCode)

	return AuditEvent{
		Timestamp:           time.Now(),
		TraceID:             traceID,
		SpanID:              spanID,
		Body:                newBody(auditAttributes, principalAttributes, resourceAttributes, errorAttributes),
		EventName:           NewEventName(resourceAttributes.ResourceKind, auditAttributes.Action),
		AuditAttributes:     auditAttributes,
		PrincipalAttributes: principalAttributes,
		ResourceAttributes:  resourceAttributes,
		ErrorAttributes:     errorAttributes,
		TransportAttributes: transportAttributes,
	}
}

func NewPLogsFromAuditEvents(events []AuditEvent, name string, version string, scope string) plog.Logs {
	logs := plog.NewLogs()

	// Group events by target resource so each ResourceLogs has uniform resource attributes.
	type resourceKey struct {
		kind string
		id   string
	}
	groups := make(map[resourceKey][]int)
	order := make([]resourceKey, 0)
	for i, event := range events {
		key := resourceKey{kind: event.ResourceAttributes.ResourceKind.String(), id: event.ResourceAttributes.ResourceID}
		if _, exists := groups[key]; !exists {
			order = append(order, key)
		}
		groups[key] = append(groups[key], i)
	}

	for _, key := range order {
		resourceLogs := logs.ResourceLogs().AppendEmpty()
		resourceAttrs := resourceLogs.Resource().Attributes()
		resourceAttrs.PutStr(string(semconv.ServiceNameKey), name)
		resourceAttrs.PutStr(string(semconv.ServiceVersionKey), version)
		events[groups[key][0]].ResourceAttributes.PutResource(resourceAttrs)

		scopeLogs := resourceLogs.ScopeLogs().AppendEmpty()
		scopeLogs.Scope().SetName(scope)

		for _, idx := range groups[key] {
			events[idx].ToLogRecord(scopeLogs.LogRecords().AppendEmpty())
		}
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

	// Resource attributes are set at the ResourceLogs level, not per-LogRecord.
	// See NewPLogsFromAuditEvents.

	// Error attributes
	event.ErrorAttributes.Put(attrs)

	// Transport context attributes
	event.TransportAttributes.Put(attrs)
}
