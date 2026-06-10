package statsreporter

import (
	"context"
	"fmt"
	"time"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// telemetryStatsCollector collects telemetry usage stats (counts and
// last-observed times per signal). Stats are deployment-scoped since telemetry
// tables carry no org column.
type telemetryStatsCollector struct {
	telemetryStore telemetrystore.TelemetryStore
}

func NewTelemetryStatsCollector(telemetryStore telemetrystore.TelemetryStore) StatsCollector {
	return &telemetryStatsCollector{telemetryStore: telemetryStore}
}

func (collector *telemetryStatsCollector) Collect(ctx context.Context, _ valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	traces, err := collector.countRows(ctx, telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName, "traces")
	if err != nil {
		return nil, err
	}
	stats["telemetry.traces.count"] = traces

	logs, err := collector.countRows(ctx, telemetrylogs.DBName, telemetrylogs.LogsV2TableName, "logs")
	if err != nil {
		return nil, err
	}
	stats["telemetry.logs.count"] = logs

	metrics, err := collector.countRows(ctx, telemetrymetrics.DBName, telemetrymetrics.SamplesV4TableName, "metrics")
	if err != nil {
		return nil, err
	}
	stats["telemetry.metrics.count"] = metrics

	// The epoch-to-now window preserves all-time last-observed semantics.
	now := time.Now()

	if tracesLastSeenAt, err := lastObservedTraces(ctx, collector.telemetryStore, time.Unix(0, 0), now); err != nil {
		return nil, err
	} else if tracesLastSeenAt != nil {
		stats["telemetry.traces.last_observed.time"] = tracesLastSeenAt.UTC()
		stats["telemetry.traces.last_observed.time_unix"] = tracesLastSeenAt.Unix()
	}

	if logsLastSeenAt, err := lastObservedLogs(ctx, collector.telemetryStore, time.Unix(0, 0), now); err != nil {
		return nil, err
	} else if logsLastSeenAt != nil {
		stats["telemetry.logs.last_observed.time"] = logsLastSeenAt.UTC()
		stats["telemetry.logs.last_observed.time_unix"] = logsLastSeenAt.Unix()
	}

	// Sourced from the attributes metadata table (cheaper than scanning
	// samples_v4) and excludes span-generated metrics, which only prove traces
	// ingestion.
	if metricsLastSeenAt, err := lastObservedMetrics(ctx, collector.telemetryStore, time.Unix(0, 0), now); err != nil {
		return nil, err
	} else if metricsLastSeenAt != nil {
		stats["telemetry.metrics.last_observed.time"] = metricsLastSeenAt.UTC()
		stats["telemetry.metrics.last_observed.time_unix"] = metricsLastSeenAt.Unix()
	}

	return stats, nil
}

func (collector *telemetryStatsCollector) countRows(ctx context.Context, dbName string, tableName string, signal string) (uint64, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("COUNT(*)")
	sb.From(fmt.Sprintf("%s.%s", dbName, tableName))

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var count uint64
	if err := collector.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&count); err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to count %s", signal)
	}

	return count, nil
}
