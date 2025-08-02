package telemetrymeter

import (
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

const (
	DBName                       = "signoz_meter"
	SamplesTableName             = "distributed_samples"
	SamplesLocalTableName        = "samples"
	SamplesV4Agg1dTableName      = "distributed_samples_agg_1d"
	SamplesV4Agg1dLocalTableName = "samples_agg_1d"
)

func AggregationColumnForSamplesTable(
	temporality metrictypes.Temporality,
	timeAggregation metrictypes.TimeAggregation,
	tableHints *metrictypes.MetricTableHints,
) string {
	var aggregationColumn string
	switch temporality {
	case metrictypes.Delta:
		// for delta metrics, we only support `RATE`/`INCREASE` both of which are sum
		// although it doesn't make sense to use anyLast, avg, min, max, count on delta metrics,
		// we are keeping it here to make sure that query will not be invalid
		switch timeAggregation {
		case metrictypes.TimeAggregationLatest:
			aggregationColumn = "anyLast(last)"
		case metrictypes.TimeAggregationSum:
			aggregationColumn = "sum(sum)"
		case metrictypes.TimeAggregationAvg:
			aggregationColumn = "sum(sum) / sum(count)"
		case metrictypes.TimeAggregationMin:
			aggregationColumn = "min(min)"
		case metrictypes.TimeAggregationMax:
			aggregationColumn = "max(max)"
		case metrictypes.TimeAggregationCount:
			aggregationColumn = "sum(count)"
		// count_distinct is not supported in aggregated tables
		case metrictypes.TimeAggregationRate, metrictypes.TimeAggregationIncrease: // only these two options give meaningful results
			aggregationColumn = "sum(sum)"
		}

	case metrictypes.Cumulative:
		// for cumulative metrics, we only support `RATE`/`INCREASE`. The max value in window is
		// used to calculate the sum which is then divided by the window size to get the rate
		switch timeAggregation {
		case metrictypes.TimeAggregationLatest:
			aggregationColumn = "anyLast(last)"
		case metrictypes.TimeAggregationSum:
			aggregationColumn = "sum(sum)"
		case metrictypes.TimeAggregationAvg:
			aggregationColumn = "sum(sum) / sum(count)"
		case metrictypes.TimeAggregationMin:
			aggregationColumn = "min(min)"
		case metrictypes.TimeAggregationMax:
			aggregationColumn = "max(max)"
		case metrictypes.TimeAggregationCount:
			aggregationColumn = "sum(count)"
		// count_distinct is not supported in aggregated tables
		case metrictypes.TimeAggregationRate, metrictypes.TimeAggregationIncrease: // only these two options give meaningful results
			aggregationColumn = "max(max)"
		}

	case metrictypes.Unspecified:
		switch timeAggregation {
		case metrictypes.TimeAggregationLatest:
			aggregationColumn = "anyLast(last)"
		case metrictypes.TimeAggregationSum:
			aggregationColumn = "sum(sum)"
		case metrictypes.TimeAggregationAvg:
			aggregationColumn = "sum(sum) / sum(count)"
		case metrictypes.TimeAggregationMin:
			aggregationColumn = "min(min)"
		case metrictypes.TimeAggregationMax:
			aggregationColumn = "max(max)"
		case metrictypes.TimeAggregationCount:
			aggregationColumn = "sum(count)"
		// count_distinct is not supported in aggregated tables
		case metrictypes.TimeAggregationRate, metrictypes.TimeAggregationIncrease: // ideally, this should never happen
			aggregationColumn = "sum(sum)"
		}

	}
	return aggregationColumn
}
