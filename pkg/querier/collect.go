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

	var (
		traces           uint64
		tracesLastSeenAt time.Time
	)
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*), max(timestamp) FROM %s", tracesTable)).Scan(&traces, &tracesLastSeenAt); err == nil {
		stats["telemetry.traces.count"] = traces
		if tracesLastSeenAt.Unix() != 0 {
			stats["telemetry.traces.last_observed.time"] = tracesLastSeenAt.UTC()
			stats["telemetry.traces.last_observed.time_unix"] = tracesLastSeenAt.Unix()
		}
	} else {
		q.logger.DebugContext(ctx, "failed to collect traces stats", errors.Attr(err))
	}

	var (
		logs           uint64
		logsLastSeenAt time.Time
	)
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*), fromUnixTimestamp64Nano(max(timestamp)) FROM %s", logsTable)).Scan(&logs, &logsLastSeenAt); err == nil {
		stats["telemetry.logs.count"] = logs
		if logsLastSeenAt.Unix() != 0 {
			stats["telemetry.logs.last_observed.time"] = logsLastSeenAt.UTC()
			stats["telemetry.logs.last_observed.time_unix"] = logsLastSeenAt.Unix()
		}
	} else {
		q.logger.DebugContext(ctx, "failed to collect logs stats", errors.Attr(err))
	}

	var (
		metrics           uint64
		metricsLastSeenAt time.Time
	)
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*), toDateTime(max(unix_milli) / 1000) FROM %s", metricsTable)).Scan(&metrics, &metricsLastSeenAt); err == nil {
		stats["telemetry.metrics.count"] = metrics
		if metricsLastSeenAt.Unix() != 0 {
			stats["telemetry.metrics.last_observed.time"] = metricsLastSeenAt.UTC()
			stats["telemetry.metrics.last_observed.time_unix"] = metricsLastSeenAt.Unix()
		}
	} else {
		q.logger.DebugContext(ctx, "failed to collect metrics stats", errors.Attr(err))
	}

	return stats, nil
}
