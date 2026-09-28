package metertelemetryschema

import "github.com/SigNoz/signoz/pkg/types/metrictypes"

// TableHintsForWindow pins the samples table the builder picks for
// [start, end), so a statement over a piece of that window reads the same
// table.
func TableHintsForWindow(start, end uint64, metricType metrictypes.Type, timeAggregation metrictypes.TimeAggregation, tableHints *metrictypes.MetricTableHints) *metrictypes.MetricTableHints {
	if tableHints != nil {
		return tableHints
	}
	return &metrictypes.MetricTableHints{SamplesTableName: WhichSamplesTableToUse(start, end, metricType, timeAggregation, nil)}
}
