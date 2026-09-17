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

// TraceTimeRangeOpts optionally restricts the trace_summary lookup to a
// padded time window so ClickHouse can prune PARTITION BY toDate(end).
//
// When FromMS and ToMS are both zero the lookup scans the whole table, which
// is the historical behaviour. A non-zero window first queries
// [FromMS-Padding, ToMS+Padding] and only falls back to the unbounded scan
// if that fast path cannot prove it saw every requested trace in full.
type TraceTimeRangeOpts struct {
	FromMS  uint64
	ToMS    uint64
	Padding time.Duration
}

type TraceTimeRangeFinder struct {
	telemetryStore telemetrystore.TelemetryStore
}

func NewTraceTimeRangeFinder(telemetryStore telemetrystore.TelemetryStore) *TraceTimeRangeFinder {
	return &TraceTimeRangeFinder{
		telemetryStore: telemetryStore,
	}
}

func (f *TraceTimeRangeFinder) GetTraceTimeRange(ctx context.Context, traceID string) (startNano, endNano int64, exists bool, error error) {
	return f.GetTraceTimeRangeMulti(ctx, []string{traceID}, TraceTimeRangeOpts{})
}

func (f *TraceTimeRangeFinder) GetTraceTimeRangeMulti(ctx context.Context, traceIDs []string, opts TraceTimeRangeOpts) (startNano, endNano int64, exists bool, error error) {
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

	windowStartNano, windowEndNano, bounded := paddedWindowNanos(opts)
	if bounded {
		query, args := buildTraceTimeRangeQuery(cleanedIDs, windowStartNano, windowEndNano)
		uniqueCount, startNano, endNano, err := f.scanTraceTimeRange(ctx, query, args)
		if err != nil {
			return 0, 0, false, err
		}
		if uniqueCount == uint64(len(cleanedIDs)) && !isCloseToWindowEdge(startNano, endNano, windowStartNano, windowEndNano, opts.Padding.Nanoseconds()) {
			startNano, endNano = applySecondPadding(startNano, endNano)
			return startNano, endNano, true, nil
		}
	}

	query, args := buildTraceTimeRangeQuery(cleanedIDs, 0, 0)
	uniqueCount, startNano, endNano, err := f.scanTraceTimeRange(ctx, query, args)
	if err != nil {
		return 0, 0, false, err
	}
	// Preserve pre-optimisation exists semantics: any matching row is enough.
	// uniqExact is used instead of count() because AggregatingMergeTree can
	// keep more than one summary row per trace_id across date partitions.
	if uniqueCount == 0 {
		return 0, 0, false, nil
	}
	startNano, endNano = applySecondPadding(startNano, endNano)
	return startNano, endNano, true, nil
}

func (f *TraceTimeRangeFinder) scanTraceTimeRange(ctx context.Context, query string, args []any) (uniqueCount uint64, startNano, endNano int64, err error) {
	err = f.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&uniqueCount, &startNano, &endNano)
	return uniqueCount, startNano, endNano, err
}

// buildTraceTimeRangeQuery returns the trace_summary lookup. When windowStartNano
// and windowEndNano are both non-zero the predicate on `end` lets ClickHouse
// prune PARTITION BY toDate(end). uniqExact(trace_id) is required because a
// single trace can occupy more than one partition (and therefore more than one
// row) when its insert batches straddle a date boundary.
func buildTraceTimeRangeQuery(traceIDs []string, windowStartNano, windowEndNano int64) (string, []any) {
	placeholders := make([]string, len(traceIDs))
	args := make([]any, 0, len(traceIDs)+2)
	for i, id := range traceIDs {
		placeholders[i] = "?"
		args = append(args, id)
	}

	timePredicate := ""
	if windowStartNano > 0 || windowEndNano > 0 {
		timePredicate = `
			AND end >= fromUnixTimestamp64Nano(?)
			AND end <= fromUnixTimestamp64Nano(?)`
		args = append(args, windowStartNano, windowEndNano)
	}

	query := fmt.Sprintf(`
		SELECT
			uniqExact(trace_id),
			%s,
			%s
		FROM %s.%s
		WHERE trace_id IN (%s)%s
	`, UnixNanoExpr("min(start)"), UnixNanoExpr("max(end)"), DBName, TraceSummaryTableName, strings.Join(placeholders, ", "), timePredicate)

	return query, args
}

func paddedWindowNanos(opts TraceTimeRangeOpts) (startNano, endNano int64, ok bool) {
	if opts.FromMS == 0 && opts.ToMS == 0 {
		return 0, 0, false
	}
	if opts.ToMS < opts.FromMS {
		return 0, 0, false
	}
	pad := opts.Padding.Nanoseconds()
	startNano = int64(opts.FromMS)*1_000_000 - pad
	if startNano < 0 {
		startNano = 0
	}
	endNano = int64(opts.ToMS)*1_000_000 + pad
	return startNano, endNano, true
}

// isCloseToWindowEdge reports that the aggregated bounds sit within `marginNano`
// of the padded scan window. That is the failure mode for a trace whose insert
// batches straddle the window: some rows (and their contribution to min/max)
// are dropped, but uniqExact still reports the trace as found.
//
// Using the padding as the margin is equivalent to comparing against the
// original unpadded [FromMS, ToMS] when Padding is the configured value.
// Traces whose surviving rows sit well inside the window after a much larger
// gap (hours beyond the padding) are not detected; the unbounded fallback
// covers missing IDs, not that rare shape.
func isCloseToWindowEdge(startNano, endNano, windowStartNano, windowEndNano, marginNano int64) bool {
	if marginNano < 0 {
		marginNano = 0
	}
	if startNano <= windowStartNano+marginNano {
		return true
	}
	if endNano >= windowEndNano-marginNano {
		return true
	}
	return false
}

func applySecondPadding(startNano, endNano int64) (int64, int64) {
	if startNano > 1_000_000_000 {
		startNano -= 1_000_000_000
	}
	endNano += 1_000_000_000
	return startNano, endNano
}

// UnixNanoExpr renders the conversion of a timestamp-typed column expression
// (DateTime64(9)) to Unix epoch nanoseconds.
func UnixNanoExpr(expr string) string {
	return fmt.Sprintf("toUnixTimestamp64Nano(%s)", expr)
}
