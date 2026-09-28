package metricsstatementbuilder

import (
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// noPredecessor is true for the first bucket of a series in the statement
// and for a bucket whose previous bucket lies further back than the lookback.
// Both get nan: a value computed against a sample outside the lookback would
// depend on where the statement window starts.
func noPredecessor(lookbackSec uint64) string {
	return fmt.Sprintf("(row_number() OVER rate_window = 1 OR (ts - lagInFrame(ts, 1) OVER rate_window) > %d)", lookbackSec)
}

// RateExpr is the per-bucket rate of a cumulative series: the increase since
// the previous bucket divided by the seconds between them; a reset counts the
// bucket's own value.
func RateExpr(lookbackSec uint64) string {
	return fmt.Sprintf(`multiIf(%s, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window))`, noPredecessor(lookbackSec))
}

// IncreaseExpr is the per-bucket increase of a cumulative series.
func IncreaseExpr(lookbackSec uint64) string {
	return fmt.Sprintf(`multiIf(%s, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value, per_series_value - lagInFrame(per_series_value, 1) OVER rate_window)`, noPredecessor(lookbackSec))
}

func rateMultiTemporalityExpr(lookbackSec uint64, delta, cumulative string) string {
	return fmt.Sprintf(`IF(LOWER(temporality) LIKE LOWER('delta'), %s, multiIf(%s, nan, (%s - lagInFrame(%s, 1) OVER rate_window) < 0, %s / (ts - lagInFrame(ts, 1) OVER rate_window), (%s - lagInFrame(%s, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window))) AS per_series_value`,
		delta, noPredecessor(lookbackSec), cumulative, cumulative, cumulative, cumulative, cumulative)
}

func increaseMultiTemporalityExpr(lookbackSec uint64, delta, cumulative string) string {
	return fmt.Sprintf(`IF(LOWER(temporality) LIKE LOWER('delta'), %s, multiIf(%s, nan, (%s - lagInFrame(%s, 1) OVER rate_window) < 0, %s, (%s - lagInFrame(%s, 1) OVER rate_window))) AS per_series_value`,
		delta, noPredecessor(lookbackSec), cumulative, cumulative, cumulative, cumulative, cumulative)
}

// usesBuffer reports whether a reduced metric reads the raw buffer, which
// holds the recent short window. Table hints pin the tables instead, so a
// hinted aggregation never switches to the buffer.
func usesBuffer(start, end uint64, agg qbtypes.MetricAggregation) bool {
	return agg.TableHints == nil && agg.Reduced &&
		end-start < metricstelemetryschema.OneDayInMilliseconds &&
		start >= uint64(time.Now().UnixMilli())-metricstelemetryschema.OneDayInMilliseconds
}

// TableHintsForWindow pins the tables the builder picks for [start, end), so
// a statement over a piece of that window reads the same tables. Nil when
// the window reads the buffer: every piece of such a window reads it too.
func TableHintsForWindow(start, end uint64, agg qbtypes.MetricAggregation) *metrictypes.MetricTableHints {
	if agg.TableHints != nil {
		return agg.TableHints
	}
	if usesBuffer(start, end, agg) {
		return nil
	}
	samplesTable, _ := metricstelemetryschema.WhichSamplesTableToUse(start, end, agg.Type, agg.TimeAggregation, false, nil)
	_, _, _, tsLocalTable := metricstelemetryschema.WhichTSTableToUse(start, end, false, nil)
	return &metrictypes.MetricTableHints{SamplesTableName: samplesTable, TimeSeriesTableName: tsLocalTable}
}
