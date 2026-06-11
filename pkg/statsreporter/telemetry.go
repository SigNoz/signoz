package statsreporter

import (
	"context"
	"database/sql"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
)

var infraMetricNames = withUnderscoreMetricNames(slices.Concat(
	inframonitoringtypes.HostsTableMetricNames,
	inframonitoringtypes.PodsTableMetricNames,
	inframonitoringtypes.NodesTableMetricNames,
))

const infraMetricLookback = 7 * 24 * time.Hour

// Probe both dot-form and underscore-normalized names (dot_metrics_enabled).
func withUnderscoreMetricNames(metricNames []string) []string {
	seen := make(map[string]struct{}, len(metricNames)*2)
	normalized := make([]string, 0, len(metricNames)*2)

	for _, metricName := range metricNames {
		for _, candidate := range []string{metricName, strings.ReplaceAll(metricName, ".", "_")} {
			if _, ok := seen[candidate]; ok {
				continue
			}

			seen[candidate] = struct{}{}
			normalized = append(normalized, candidate)
		}
	}

	return normalized
}

// Last-observed queries match the previous analytics provider queries. They are
// deployment-scoped since telemetry tables have no org column.
func lastObservedLogs(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) (*time.Time, error) {
	query := fmt.Sprintf("SELECT fromUnixTimestamp64Nano(max(timestamp)) FROM %s.%s", telemetrylogs.DBName, telemetrylogs.LogsV2TableName)
	return scanLastObserved(ctx, telemetryStore, "logs", query)
}

func lastObservedTraces(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) (*time.Time, error) {
	query := fmt.Sprintf("SELECT max(timestamp) FROM %s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName)
	return scanLastObserved(ctx, telemetryStore, "traces", query)
}

func lastObservedMetrics(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) (*time.Time, error) {
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

func (h *handler) getHasInfraMetrics(ctx context.Context, now time.Time) (bool, error) {
	cutoff := now.Add(-infraMetricLookback)

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("1")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(
		sb.GE("last_reported_unix_milli", cutoff.UnixMilli()),
		sb.LE("last_reported_unix_milli", now.UnixMilli()),
		sb.In("metric_name", sqlbuilder.List(infraMetricNames)),
	)
	sb.Limit(1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var exists uint8
	err := h.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&exists)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}

		return false, errors.WrapInternalf(err, errors.CodeInternal, "failed to check infra metrics presence")
	}

	return true, nil
}
