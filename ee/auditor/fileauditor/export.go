package fileauditor

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
)

// export converts a batch of audit events to OTLP-JSON log records and appends
// the encoded payload to the configured file as one NDJSON line per batch.
// Mirrors the wire format that otlphttpauditor sends, so downstream tools can
// consume both transports interchangeably.
func (provider *provider) export(ctx context.Context, events []audittypes.AuditEvent) error {
	logs := audittypes.NewPLogsFromAuditEvents(events, "signoz", provider.build.Version(), "signoz.audit")

	payload, err := provider.marshaler.MarshalLogs(logs)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, auditor.ErrCodeAuditExportFailed, "failed to marshal audit logs")
	}

	// Combine the payload and trailing newline into one Write call so the line
	// is emitted in a single syscall — concurrent readers see either the full
	// line or nothing, never a torn JSON object.
	payload = append(payload, '\n')

	provider.mu.Lock()
	defer provider.mu.Unlock()

	if _, err := provider.file.Write(payload); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "audit export failed", errors.Attr(err), slog.Int("dropped_log_records", len(events)))
		return errors.Wrapf(err, errors.TypeInternal, auditor.ErrCodeAuditExportFailed, "failed to write audit logs")
	}

	return provider.file.Sync()
}
