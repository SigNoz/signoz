package otlphttpauditor

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
	otellog "go.opentelemetry.io/otel/log"
)

func (p *provider) export(ctx context.Context, events []audittypes.AuditEvent) error {
	for i := range events {
		record := eventToLogRecord(events[i])
		p.logger.Emit(ctx, record)
	}

	return p.processor.FlushBatch(ctx)
}

func eventToLogRecord(event audittypes.AuditEvent) otellog.Record {
	var record otellog.Record

	record.SetTimestamp(event.Timestamp)
	record.SetBody(otellog.StringValue(event.Body))
	record.SetEventName(event.EventName.String())

	if event.Outcome == audittypes.OutcomeSuccess {
		record.SetSeverity(otellog.SeverityInfo)
		record.SetSeverityText("INFO")
	} else {
		record.SetSeverity(otellog.SeverityError)
		record.SetSeverityText("ERROR")
	}

	attrs := make([]otellog.KeyValue, 0, 20)

	// Principal attributes
	attrs = append(attrs,
		otellog.String("signoz.audit.principal.id", event.PrincipalID),
		otellog.String("signoz.audit.principal.email", event.PrincipalEmail),
		otellog.String("signoz.audit.principal.type", event.PrincipalType.StringValue()),
		otellog.String("signoz.audit.principal.org_id", event.PrincipalOrgID),
	)
	if event.IdentNProvider != "" {
		attrs = append(attrs, otellog.String("signoz.audit.identn_provider", event.IdentNProvider))
	}

	// Action attributes
	attrs = append(attrs,
		otellog.String("signoz.audit.action", event.Action.StringValue()),
		otellog.String("signoz.audit.action_category", event.ActionCategory.StringValue()),
		otellog.String("signoz.audit.outcome", event.Outcome.StringValue()),
	)

	// Resource attributes
	attrs = append(attrs, otellog.String("signoz.audit.resource.name", event.ResourceName))
	if event.ResourceID != "" {
		attrs = append(attrs, otellog.String("signoz.audit.resource.id", event.ResourceID))
	}

	// Error attributes (on failure)
	if event.ErrorType != "" {
		attrs = append(attrs, otellog.String("signoz.audit.error.type", event.ErrorType))
	}
	if event.ErrorCode != "" {
		attrs = append(attrs, otellog.String("signoz.audit.error.code", event.ErrorCode))
	}
	if event.ErrorMessage != "" {
		attrs = append(attrs, otellog.String("signoz.audit.error.message", event.ErrorMessage))
	}

	// Transport context attributes
	if event.HTTPMethod != "" {
		attrs = append(attrs, otellog.String("http.request.method", event.HTTPMethod))
	}
	if event.HTTPRoute != "" {
		attrs = append(attrs, otellog.String("http.route", event.HTTPRoute))
	}
	if event.HTTPStatusCode != 0 {
		attrs = append(attrs, otellog.Int("http.response.status_code", event.HTTPStatusCode))
	}
	if event.URLPath != "" {
		attrs = append(attrs, otellog.String("url.path", event.URLPath))
	}
	if event.ClientAddress != "" {
		attrs = append(attrs, otellog.String("client.address", event.ClientAddress))
	}
	if event.UserAgent != "" {
		attrs = append(attrs, otellog.String("user_agent.original", event.UserAgent))
	}

	record.AddAttributes(attrs...)
	return record
}

func buildBody(event audittypes.AuditEvent) string {
	if event.Outcome == audittypes.OutcomeSuccess {
		return fmt.Sprintf("%s (%s) %s %s %s", event.PrincipalEmail, event.PrincipalID, event.Action.PastTense(), event.ResourceName, event.ResourceID)
	}

	return fmt.Sprintf("%s (%s) failed to %s %s %s: %s (%s)", event.PrincipalEmail, event.PrincipalID, event.Action.StringValue(), event.ResourceName, event.ResourceID, event.ErrorType, event.ErrorCode)
}
