package prometheustest

import (
	cmock "github.com/SigNoz/clickhouse-go-mock"
)

// GridCols is the result shape of a transpiled unit statement.
var GridCols = []cmock.ColumnType{
	{Name: "gkey", Type: "String"},
	{Name: "grid", Type: "Array(Nullable(Float64))"},
}

// LastSampleGrid builds the grid a transpiled instant selector returns: per
// slot t, the latest sample in the left-open lookback window (t-lookback, t].
func LastSampleGrid(tsMs []int64, values []float64, startMs, endMs, stepMs, lookbackMs int64) []*float64 {
	grid := make([]*float64, (endMs-startMs)/stepMs+1)
	for i := range grid {
		slot := startMs + int64(i)*stepMs
		best := -1
		for j, ts := range tsMs {
			if ts > slot-lookbackMs && ts <= slot && (best == -1 || ts >= tsMs[best]) {
				best = j
			}
		}
		if best >= 0 {
			v := values[best]
			grid[i] = &v
		}
	}
	return grid
}
