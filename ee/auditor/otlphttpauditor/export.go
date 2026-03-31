package otlphttpauditor

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
)

func (p *provider) export(ctx context.Context, events []audittypes.AuditEvent) error {
	for i := range events {
		record := audittypes.ToLogRecord(events[i])
		p.logger.Emit(ctx, record)
	}

	return p.processor.FlushBatch(ctx)
}
