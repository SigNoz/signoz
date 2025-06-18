package telemetrytraces

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

const (
	SignozSpansTableName      = "distributed_signoz_spans"
	SignozSpansLocalTableName = "signoz_spans"
)

// TraceTimeRangeFinder finds the time range of a trace given its ID
type TraceTimeRangeFinder struct {
	telemetryStore telemetrystore.TelemetryStore
}

func NewTraceTimeRangeFinder(telemetryStore telemetrystore.TelemetryStore) *TraceTimeRangeFinder {
	return &TraceTimeRangeFinder{
		telemetryStore: telemetryStore,
	}
}

// GetTraceTimeRange queries the signoz_spans table to find the start and end time of a trace
func (f *TraceTimeRangeFinder) GetTraceTimeRange(ctx context.Context, traceID string) (startNano, endNano uint64, err error) {
	traceIDs := []string{traceID}
	return f.GetTraceTimeRangeMulti(ctx, traceIDs)
}

// GetTraceTimeRangeMulti queries the signoz_spans table to find the start and end time across multiple traces
func (f *TraceTimeRangeFinder) GetTraceTimeRangeMulti(ctx context.Context, traceIDs []string) (startNano, endNano uint64, err error) {
	if len(traceIDs) == 0 {
		return 0, 0, fmt.Errorf("no trace IDs provided")
	}

	// Clean the trace IDs - remove any quotes
	cleanedIDs := make([]string, len(traceIDs))
	for i, id := range traceIDs {
		cleanedIDs[i] = strings.Trim(id, "'\"")
	}

	// Build placeholders for the IN clause
	placeholders := make([]string, len(cleanedIDs))
	args := make([]any, len(cleanedIDs))
	for i, id := range cleanedIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	// Query to find min and max timestamp across all traces
	query := fmt.Sprintf(`
		SELECT 
			toUnixTimestamp64Nano(min(timestamp)) as start_time,
			toUnixTimestamp64Nano(max(timestamp)) as end_time
		FROM %s.%s
		WHERE traceID IN (%s)
		AND timestamp >= now() - INTERVAL 30 DAY
	`, DBName, SignozSpansTableName, strings.Join(placeholders, ", "))

	row := f.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...)

	err = row.Scan(&startNano, &endNano)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, 0, fmt.Errorf("traces not found: %v", cleanedIDs)
		}
		return 0, 0, fmt.Errorf("failed to query trace time range: %w", err)
	}

	// Add some buffer time (1 second before and after)
	if startNano > 1_000_000_000 { // 1 second in nanoseconds
		startNano -= 1_000_000_000
	}
	endNano += 1_000_000_000

	return startNano, endNano, nil
}
