package implannotations

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (m *module) Collect(ctx context.Context, _ valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	query := fmt.Sprintf(
		"SELECT (SELECT count() FROM (SELECT 1 FROM %s.%s WHERE labels LIKE '%%\"service.version\"%%' LIMIT 1)), (SELECT count() FROM (SELECT 1 FROM %s.%s WHERE labels LIKE '%%\"service.version\"%%' LIMIT 1))",
		tracesTables.dbName, tracesTables.resourceTable, logsTables.dbName, logsTables.resourceTable,
	)
	var tracesCount, logsCount uint64
	if err := m.telemetryStore.ClickhouseDB().QueryRow(ctx, query).Scan(&tracesCount, &logsCount); err == nil {
		stats["telemetry.traces.service_version.exists"] = tracesCount > 0
		stats["telemetry.logs.service_version.exists"] = logsCount > 0
	} else {
		m.logger.DebugContext(ctx, "failed to collect service.version existence stats", errors.Attr(err))
	}

	return stats, nil
}
