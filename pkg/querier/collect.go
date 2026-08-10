package querier

import (
	"context"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (q *querier) Collect(ctx context.Context, _ valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	tracesTable := fmt.Sprintf("%s.%s", tracestelemetryschema.DBName, tracestelemetryschema.SpanIndexV3TableName)
	logsTable := fmt.Sprintf("%s.%s", logstelemetryschema.DBName, logstelemetryschema.LogsV2TableName)
	metricsTable := fmt.Sprintf("%s.%s", metricstelemetryschema.DBName, metricstelemetryschema.SamplesV4TableName)

	var (
		traces           uint64
		tracesLastSeenAt time.Time
	)
	tracesLastSeenExpr := "max(timestamp)"
	if q.hasColumn(ctx, tracestelemetryschema.DBName, tracestelemetryschema.SpanIndexV3TableName, "inserted_at") {
		tracesLastSeenExpr = "max(inserted_at)"
	}
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*), %s FROM %s", tracesLastSeenExpr, tracesTable)).Scan(&traces, &tracesLastSeenAt); err == nil {
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
	logsLastSeenExpr := "fromUnixTimestamp64Nano(max(timestamp))"
	if q.hasColumn(ctx, logstelemetryschema.DBName, logstelemetryschema.LogsV2TableName, "inserted_at") {
		logsLastSeenExpr = "max(inserted_at)"
	}
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*), %s FROM %s", logsLastSeenExpr, logsTable)).Scan(&logs, &logsLastSeenAt); err == nil {
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
	metricsLastSeenExpr := "toDateTime(max(unix_milli) / 1000)"
	if q.hasColumn(ctx, metricstelemetryschema.DBName, metricstelemetryschema.SamplesV4TableName, "inserted_at_unix_milli") {
		metricsLastSeenExpr = "fromUnixTimestamp64Milli(max(inserted_at_unix_milli))"
	}
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*), %s FROM %s", metricsLastSeenExpr, metricsTable)).Scan(&metrics, &metricsLastSeenAt); err == nil {
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

func (q *querier) hasColumn(ctx context.Context, database, table, column string) bool {
	var exists bool
	if err := q.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT hasColumnInTable(?, ?, ?)", database, table, column).Scan(&exists); err != nil {
		q.logger.DebugContext(ctx, "failed to check column existence", errors.Attr(err))
		return false
	}
	return exists
}
