package statsreporter

import (
	"context"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
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

	if traces, err := collector.countRows(ctx, "SELECT COUNT(*) FROM signoz_traces.distributed_signoz_index_v3"); err == nil {
		stats["telemetry.traces.count"] = traces
	}

	if logs, err := collector.countRows(ctx, "SELECT COUNT(*) FROM signoz_logs.distributed_logs_v2"); err == nil {
		stats["telemetry.logs.count"] = logs
	}

	if metrics, err := collector.countRows(ctx, "SELECT COUNT(*) FROM signoz_metrics.distributed_samples_v4"); err == nil {
		stats["telemetry.metrics.count"] = metrics
	}

	if tracesLastSeenAt, err := lastObservedTraces(ctx, collector.telemetryStore); err == nil && tracesLastSeenAt != nil {
		stats["telemetry.traces.last_observed.time"] = tracesLastSeenAt.UTC()
		stats["telemetry.traces.last_observed.time_unix"] = tracesLastSeenAt.Unix()
	}

	if logsLastSeenAt, err := lastObservedLogs(ctx, collector.telemetryStore); err == nil && logsLastSeenAt != nil {
		stats["telemetry.logs.last_observed.time"] = logsLastSeenAt.UTC()
		stats["telemetry.logs.last_observed.time_unix"] = logsLastSeenAt.Unix()
	}

	if metricsLastSeenAt, err := lastObservedMetrics(ctx, collector.telemetryStore); err == nil && metricsLastSeenAt != nil {
		stats["telemetry.metrics.last_observed.time"] = metricsLastSeenAt.UTC()
		stats["telemetry.metrics.last_observed.time_unix"] = metricsLastSeenAt.Unix()
	}

	return stats, nil
}

func (collector *telemetryStatsCollector) countRows(ctx context.Context, query string) (uint64, error) {
	var count uint64
	err := collector.telemetryStore.ClickhouseDB().QueryRow(ctx, query).Scan(&count)
	return count, err
}
