package kafkaauditor

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/twmb/franz-go/pkg/kgo"
)

// Produces the whole batch as a single record so the collector's otlp_proto unmarshaler reads it as one ExportLogsServiceRequest.
func (provider *provider) export(ctx context.Context, events []audittypes.AuditEvent) error {
	logs := audittypes.NewPLogsFromAuditEvents(events, "signoz", provider.build.Version(), "signoz.audit")

	value, err := provider.marshaler.MarshalLogs(logs)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, auditor.ErrCodeAuditExportFailed, "failed to marshal audit logs")
	}

	record := &kgo.Record{Topic: provider.config.Kafka.Topic, Value: value}
	if err := provider.client.ProduceSync(ctx, record).FirstErr(); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "audit export failed", errors.Attr(err), slog.Int("dropped_log_records", len(events)))

		return errors.Wrapf(err, errors.TypeInternal, auditor.ErrCodeAuditExportFailed, "failed to produce audit logs to topic %q", provider.config.Kafka.Topic)
	}

	return nil
}
