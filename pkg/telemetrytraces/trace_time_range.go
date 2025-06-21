package telemetrytraces

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

type TraceTimeRangeFinder struct {
	telemetryStore telemetrystore.TelemetryStore
}

func NewTraceTimeRangeFinder(telemetryStore telemetrystore.TelemetryStore) *TraceTimeRangeFinder {
	return &TraceTimeRangeFinder{
		telemetryStore: telemetryStore,
	}
}

func (f *TraceTimeRangeFinder) GetTraceTimeRange(ctx context.Context, traceID string) (startNano, endNano int64, err error) {
	traceIDs := []string{traceID}
	return f.GetTraceTimeRangeMulti(ctx, traceIDs)
}

func (f *TraceTimeRangeFinder) GetTraceTimeRangeMulti(ctx context.Context, traceIDs []string) (startNano, endNano int64, err error) {
	if len(traceIDs) == 0 {
		return 0, 0, fmt.Errorf("no trace IDs provided")
	}

	cleanedIDs := make([]string, len(traceIDs))
	for i, id := range traceIDs {
		cleanedIDs[i] = strings.Trim(id, "'\"")
	}

	placeholders := make([]string, len(cleanedIDs))
	args := make([]any, len(cleanedIDs))
	for i, id := range cleanedIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT 
			toUnixTimestamp64Nano(min(start)),
			toUnixTimestamp64Nano(max(end))
		FROM %s.%s
		WHERE trace_id IN (%s)
	`, DBName, TraceSummaryTableName, strings.Join(placeholders, ", "))

	row := f.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...)

	err = row.Scan(&startNano, &endNano)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, 0, fmt.Errorf("traces not found: %v", cleanedIDs)
		}
		return 0, 0, fmt.Errorf("failed to query trace time range: %w", err)
	}

	if startNano > 1_000_000_000 {
		startNano -= 1_000_000_000
	}
	endNano += 1_000_000_000

	return startNano, endNano, nil
}
