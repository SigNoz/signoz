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
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/emptystatetypes"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
)

var infraMetricNames = withUnderscoreMetricNames(slices.Concat(
	inframonitoringtypes.HostsTableMetricNames,
	inframonitoringtypes.PodsTableMetricNames,
	inframonitoringtypes.NodesTableMetricNames,
))

// Span-derived metrics (signoz_calls_total, signoz_latency, ...) come from the
// collector's spanmetrics processor, so they must not count as metrics ingestion.
const spanGeneratedMetricsLikePattern = `signoz\_%`

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

// Last-observed queries are shared by the telemetry stats collector
// (epoch-to-now window, 6h reporting cadence) and the org-context handler
// (a bounded lookback window, per request). They are deployment-scoped
// (telemetry tables have no org_id) and bounded on both sides so future-dated
// rows cannot surface as last observed.

func lastObservedLogs(ctx context.Context, telemetryStore telemetrystore.TelemetryStore, from time.Time, to time.Time) (*time.Time, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("fromUnixTimestamp64Nano(max(timestamp))")
	sb.From(fmt.Sprintf("%s.%s", telemetrylogs.DBName, telemetrylogs.LogsV2TableName))
	sb.Where(
		sb.GE("ts_bucket_start", max(from.Unix()-querybuilder.BucketAdjustment, 0)),
		sb.LE("ts_bucket_start", to.Unix()),
		sb.GE("timestamp", fmt.Sprintf("%d", from.UnixNano())),
		sb.LE("timestamp", fmt.Sprintf("%d", to.UnixNano())),
	)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return scanLastObserved(ctx, telemetryStore, "logs", query, args...)
}

func lastObservedTraces(ctx context.Context, telemetryStore telemetrystore.TelemetryStore, from time.Time, to time.Time) (*time.Time, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("max(timestamp)")
	sb.From(fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))
	sb.Where(
		sb.GE("ts_bucket_start", max(from.Unix()-querybuilder.BucketAdjustment, 0)),
		sb.LE("ts_bucket_start", to.Unix()),
		sb.GE("timestamp", fmt.Sprintf("%d", from.UnixNano())),
		sb.LE("timestamp", fmt.Sprintf("%d", to.UnixNano())),
	)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return scanLastObserved(ctx, telemetryStore, "traces", query, args...)
}

// lastObservedMetrics reads the attributes metadata table, a maintained
// per-metric last-seen that is far cheaper than scanning samples.
func lastObservedMetrics(ctx context.Context, telemetryStore telemetrystore.TelemetryStore, from time.Time, to time.Time) (*time.Time, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("max(last_reported_unix_milli)")
	sb.From(fmt.Sprintf("%s.%s", telemetrymetrics.DBName, telemetrymetrics.AttributesMetadataTableName))
	sb.Where(
		sb.GE("last_reported_unix_milli", from.UnixMilli()),
		sb.LE("last_reported_unix_milli", to.UnixMilli()),
		sb.NotLike("metric_name", spanGeneratedMetricsLikePattern),
	)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var lastObservedMilli sql.NullInt64
	err := telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&lastObservedMilli)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil //nolint:nilnil
		}

		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to check metrics last observed")
	}

	if !lastObservedMilli.Valid || lastObservedMilli.Int64 == 0 {
		return nil, nil //nolint:nilnil
	}

	lastObservedAt := time.UnixMilli(lastObservedMilli.Int64).UTC()
	return &lastObservedAt, nil
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
	cutoff := now.Add(-emptystatetypes.LastIngestedLookback)

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
