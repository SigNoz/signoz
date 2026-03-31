package otlphttpauditor

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
	sdklog "go.opentelemetry.io/otel/sdk/log"
)

func (p *provider) export(ctx context.Context, events []audittypes.AuditEvent) error {
	records := make([]sdklog.Record, len(events))
	for i := range events {
		records[i] = events[i].ToLogRecord()
	}

	return p.exporter.Export(ctx, records)
}
