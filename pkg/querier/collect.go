package querier

import (
	"context"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (q *querier) Collect(ctx context.Context, _ valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	tracesTable := fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName)
	logsTable := fmt.Sprintf("%s.%s", telemetrylogs.DBName, telemetrylogs.LogsV2TableName)
	metricsTable := fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4TableName)

	var traces uint64
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", tracesTable)).Scan(&traces); err == nil {
		stats["telemetry.traces.count"] = traces
	} else {
		q.logger.DebugContext(ctx, "failed to collect traces count", errors.Attr(err))
	}

	var logs uint64
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", logsTable)).Scan(&logs); err == nil {
		stats["telemetry.logs.count"] = logs
	} else {
		q.logger.DebugContext(ctx, "failed to collect logs count", errors.Attr(err))
	}

	var metrics uint64
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", metricsTable)).Scan(&metrics); err == nil {
		stats["telemetry.metrics.count"] = metrics
	} else {
		q.logger.DebugContext(ctx, "failed to collect metrics count", errors.Attr(err))
	}

	var tracesLastSeenAt time.Time
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT max(timestamp) FROM %s", tracesTable)).Scan(&tracesLastSeenAt); err == nil {
		if tracesLastSeenAt.Unix() != 0 {
			stats["telemetry.traces.last_observed.time"] = tracesLastSeenAt.UTC()
			stats["telemetry.traces.last_observed.time_unix"] = tracesLastSeenAt.Unix()
		}
	} else {
		q.logger.DebugContext(ctx, "failed to collect traces last observed", errors.Attr(err))
	}

	var logsLastSeenAt time.Time
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT fromUnixTimestamp64Nano(max(timestamp)) FROM %s", logsTable)).Scan(&logsLastSeenAt); err == nil {
		if logsLastSeenAt.Unix() != 0 {
			stats["telemetry.logs.last_observed.time"] = logsLastSeenAt.UTC()
			stats["telemetry.logs.last_observed.time_unix"] = logsLastSeenAt.Unix()
		}
	} else {
		q.logger.DebugContext(ctx, "failed to collect logs last observed", errors.Attr(err))
	}

	var metricsLastSeenAt time.Time
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT toDateTime(max(unix_milli) / 1000) FROM %s", metricsTable)).Scan(&metricsLastSeenAt); err == nil {
		if metricsLastSeenAt.Unix() != 0 {
			stats["telemetry.metrics.last_observed.time"] = metricsLastSeenAt.UTC()
			stats["telemetry.metrics.last_observed.time_unix"] = metricsLastSeenAt.Unix()
		}
	} else {
		q.logger.DebugContext(ctx, "failed to collect metrics last observed", errors.Attr(err))
	}

	return stats, nil
}
