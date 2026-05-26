package telemetrytraces

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type TraceTimeRangeFinder struct {
	telemetryStore telemetrystore.TelemetryStore
}

func NewTraceTimeRangeFinder(telemetryStore telemetrystore.TelemetryStore) *TraceTimeRangeFinder {
	return &TraceTimeRangeFinder{
		telemetryStore: telemetryStore,
	}
}

func (f *TraceTimeRangeFinder) GetTraceTimeRange(ctx context.Context, traceID string) (startNano, endNano int64, exists bool, error error) {
	traceIDs := []string{traceID}
	return f.GetTraceTimeRangeMulti(ctx, traceIDs)
}

func (f *TraceTimeRangeFinder) GetTraceTimeRangeMulti(ctx context.Context, traceIDs []string) (startNano, endNano int64, exists bool, error error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalTraces.StringValue(),
		instrumentationtypes.CodeNamespace:    "trace-time-range",
		instrumentationtypes.CodeFunctionName: "GetTraceTimeRangeMulti",
	})
	if len(traceIDs) == 0 {
		return 0, 0, false, nil
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
			count(),
			toUnixTimestamp64Nano(min(start)),
			toUnixTimestamp64Nano(max(end))
		FROM %s.%s
		WHERE trace_id IN (%s)
	`, DBName, TraceSummaryTableName, strings.Join(placeholders, ", "))

	row := f.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...)

	var rowCount uint64
	err := row.Scan(&rowCount, &startNano, &endNano)
	if err != nil {
		return 0, 0, false, err
	}

	if rowCount == 0 {
		return 0, 0, false, nil
	}

	if startNano > 1_000_000_000 {
		startNano -= 1_000_000_000
	}
	endNano += 1_000_000_000

	return startNano, endNano, true, nil
}
