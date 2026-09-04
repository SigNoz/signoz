package tracestelemetryschema

import (
	"context"
	"fmt"
	"strings"
	"time"

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

func (f *TraceTimeRangeFinder) GetTraceTimeRange(ctx context.Context, traceID string, searchFromMS, searchToMS uint64) (startNano, endNano int64, exists bool, error error) {
	traceIDs := []string{traceID}
	return f.GetTraceTimeRangeMulti(ctx, traceIDs, searchFromMS, searchToMS)
}

func (f *TraceTimeRangeFinder) GetTraceTimeRangeMulti(ctx context.Context, traceIDs []string, searchFromMS, searchToMS uint64) (startNano, endNano int64, exists bool, error error) {
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

	boundedQuery, unboundedQuery := buildTraceTimeRangeQueries(strings.Join(placeholders, ", "), searchFromMS, searchToMS)

	if boundedQuery != "" {
		var uniqueCount uint64
		err := f.telemetryStore.ClickhouseDB().QueryRow(ctx, boundedQuery, args...).Scan(&uniqueCount, &startNano, &endNano)
		if err == nil && uniqueCount == uint64(len(traceIDs)) {
			if !isSuspiciouslyCloseToEdge(searchFromMS, searchToMS, uint64(startNano), uint64(endNano)) {
				if startNano > 1_000_000_000 {
					startNano -= 1_000_000_000
				}
				endNano += 1_000_000_000

				return startNano, endNano, true, nil
			}
		}
	}

	var uniqueCount uint64
	err := f.telemetryStore.ClickhouseDB().QueryRow(ctx, unboundedQuery, args...).Scan(&uniqueCount, &startNano, &endNano)
	if err != nil {
		return 0, 0, false, err
	}

	if uniqueCount != uint64(len(traceIDs)) {
		return 0, 0, false, nil
	}

	if startNano > 1_000_000_000 {
		startNano -= 1_000_000_000
	}
	endNano += 1_000_000_000

	return startNano, endNano, true, nil
}

func isSuspiciouslyCloseToEdge(searchFromMS, searchToMS, startNano, endNano uint64) bool {
	marginNano := uint64(time.Hour.Nanoseconds())
	if searchFromMS > 0 && startNano < (searchFromMS*1_000_000)+marginNano {
		return true
	}
	if searchToMS > 0 && endNano > (searchToMS*1_000_000)-marginNano {
		return true
	}
	return false
}

// UnixNanoExpr renders the conversion of a timestamp-typed column expression
// (DateTime64(9)) to Unix epoch nanoseconds.
func UnixNanoExpr(expr string) string {
	return fmt.Sprintf("toUnixTimestamp64Nano(%s)", expr)
}
