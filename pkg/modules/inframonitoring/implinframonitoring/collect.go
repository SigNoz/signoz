package implinframonitoring

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (m *module) Collect(ctx context.Context, _ valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	metadataTable := fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName)
	var (
		systemMetricCount uint64
		k8sMetricCount    uint64
	)
	query := fmt.Sprintf(
		"SELECT (SELECT count() FROM (SELECT 1 FROM %s WHERE metric_name LIKE 'system.%%' LIMIT 1)), (SELECT count() FROM (SELECT 1 FROM %s WHERE metric_name LIKE 'k8s.%%' LIMIT 1))",
		metadataTable, metadataTable,
	)
	if err := m.telemetryStore.ClickhouseDB().QueryRow(ctx, query).Scan(&systemMetricCount, &k8sMetricCount); err == nil {
		stats["telemetry.metrics.system.exists"] = systemMetricCount > 0
		stats["telemetry.metrics.k8s.exists"] = k8sMetricCount > 0
	} else {
		m.logger.DebugContext(ctx, "failed to collect metrics namespace existence stats", errors.Attr(err))
	}

	return stats, nil
}
