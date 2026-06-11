// Package telemetrystatscollector implements the telemetry usage StatsCollector
// and exports the shared last-observed ClickHouse queries.
package telemetrystatscollector

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// collector collects telemetry usage stats (counts and last-observed times per
// signal). Stats are deployment-scoped since telemetry tables carry no org column.
type collector struct {
	telemetryStore telemetrystore.TelemetryStore
}

func New(telemetryStore telemetrystore.TelemetryStore) statsreporter.StatsCollector {
	return &collector{telemetryStore: telemetryStore}
}

func (c *collector) Collect(ctx context.Context, _ valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	if traces, err := c.countRows(ctx, "SELECT COUNT(*) FROM signoz_traces.distributed_signoz_index_v3"); err == nil {
		stats["telemetry.traces.count"] = traces
	}

	if logs, err := c.countRows(ctx, "SELECT COUNT(*) FROM signoz_logs.distributed_logs_v2"); err == nil {
		stats["telemetry.logs.count"] = logs
	}

	if metrics, err := c.countRows(ctx, "SELECT COUNT(*) FROM signoz_metrics.distributed_samples_v4"); err == nil {
		stats["telemetry.metrics.count"] = metrics
	}

	if tracesLastSeenAt, err := LastObservedTraces(ctx, c.telemetryStore); err == nil && tracesLastSeenAt != nil {
		stats["telemetry.traces.last_observed.time"] = tracesLastSeenAt.UTC()
		stats["telemetry.traces.last_observed.time_unix"] = tracesLastSeenAt.Unix()
	}

	if logsLastSeenAt, err := LastObservedLogs(ctx, c.telemetryStore); err == nil && logsLastSeenAt != nil {
		stats["telemetry.logs.last_observed.time"] = logsLastSeenAt.UTC()
		stats["telemetry.logs.last_observed.time_unix"] = logsLastSeenAt.Unix()
	}

	if metricsLastSeenAt, err := LastObservedMetrics(ctx, c.telemetryStore); err == nil && metricsLastSeenAt != nil {
		stats["telemetry.metrics.last_observed.time"] = metricsLastSeenAt.UTC()
		stats["telemetry.metrics.last_observed.time_unix"] = metricsLastSeenAt.Unix()
	}

	return stats, nil
}

func (c *collector) countRows(ctx context.Context, query string) (uint64, error) {
	var count uint64
	err := c.telemetryStore.ClickhouseDB().QueryRow(ctx, query).Scan(&count)
	return count, err
}

// Last-observed queries are deployment-scoped since telemetry tables have no
// org column. Exported because the org context API reuses them per request.
func LastObservedLogs(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) (*time.Time, error) {
	query := fmt.Sprintf("SELECT fromUnixTimestamp64Nano(max(timestamp)) FROM %s.%s", telemetrylogs.DBName, telemetrylogs.LogsV2TableName)
	return scanLastObserved(ctx, telemetryStore, "logs", query)
}

func LastObservedTraces(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) (*time.Time, error) {
	query := fmt.Sprintf("SELECT max(timestamp) FROM %s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName)
	return scanLastObserved(ctx, telemetryStore, "traces", query)
}

func LastObservedMetrics(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) (*time.Time, error) {
	query := fmt.Sprintf("SELECT toDateTime(max(unix_milli) / 1000) FROM %s.%s", telemetrymetrics.DBName, telemetrymetrics.SamplesV4TableName)
	return scanLastObserved(ctx, telemetryStore, "metrics", query)
}

func scanLastObserved(ctx context.Context, telemetryStore telemetrystore.TelemetryStore, signal string, query string, args ...any) (*time.Time, error) {
	var lastObserved time.Time
	err := telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&lastObserved)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil //nolint:nilnil
		}

		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to check %s last observed", signal)
	}

	if lastObserved.Unix() <= 0 {
		return nil, nil //nolint:nilnil
	}

	lastObservedAt := lastObserved.UTC()
	return &lastObservedAt, nil
}
