package metricsstatementbuilder

import "fmt"

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
