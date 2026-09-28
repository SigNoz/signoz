package metricstelemetryschema

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

// UsesBuffer reports whether a reduced metric reads the raw buffer, which
// holds the recent short window. Table hints pin the tables instead, so a
// hinted aggregation never switches to the buffer.
func UsesBuffer(start, end uint64, reduced bool, tableHints *metrictypes.MetricTableHints) bool {
	return tableHints == nil && reduced &&
		end-start < OneDayInMilliseconds &&
		start >= uint64(time.Now().UnixMilli())-OneDayInMilliseconds
}

// TableHintsForWindow pins the tables the builder picks for [start, end), so
// a statement over a piece of that window reads the same tables. Nil when
// the window reads the buffer: every piece of such a window reads it too.
func TableHintsForWindow(start, end uint64, metricType metrictypes.Type, timeAggregation metrictypes.TimeAggregation, reduced bool, tableHints *metrictypes.MetricTableHints) *metrictypes.MetricTableHints {
	if tableHints != nil {
		return tableHints
	}
	if UsesBuffer(start, end, reduced, nil) {
		return nil
	}
	samplesTable, _ := WhichSamplesTableToUse(start, end, metricType, timeAggregation, false, nil)
	_, _, _, tsLocalTable := WhichTSTableToUse(start, end, false, nil)
	return &metrictypes.MetricTableHints{SamplesTableName: samplesTable, TimeSeriesTableName: tsLocalTable}
}
