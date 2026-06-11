package statsreporter

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
)

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
