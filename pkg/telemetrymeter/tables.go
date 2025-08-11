package telemetrymeter

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

const (
	DBName                     = "signoz_meter"
	SamplesTableName           = "distributed_samples"
	SamplesLocalTableName      = "samples"
	SamplesAgg1dTableName      = "distributed_samples_agg_1d"
	SamplesAgg1dLocalTableName = "samples_agg_1d"
)

var (
	oneMonthInMilliseconds = uint64(time.Hour.Milliseconds() * 24 * 30)

	// when the query requests for almost 1 day, but not exactly 1 day, we need to add an offset to the end time
	// to make sure that we are using the correct table
	// this is because the start gets adjusted to the nearest step interval and uses the 5m table for 4m step interval
	// leading to time series that doesn't best represent the rate of change
	offsetBucket = uint64(1 * time.Hour.Milliseconds())
)

// start and end are in milliseconds
// we have two tables for samples
// 1. distributed_samples
// 2. distributed_samples_agg_1d - for queries with time range above or equal to 30 days
// if the `timeAggregation` is `count_distinct` we can't use the aggregated tables because they don't support it
func WhichSamplesTableToUse(
	start, end uint64,
	metricType metrictypes.Type,
	timeAggregation metrictypes.TimeAggregation,
	tableHints *metrictypes.MetricTableHints,
) string {

	// if we have a hint for the table, we need to use it
	// the hint will be used to override the default table selection logic
	if tableHints != nil {
		if tableHints.SamplesTableName != "" {
			return tableHints.SamplesTableName
		}
	}

	// if the time aggregation is count_distinct, we need to use the distributed_samples table
	// because the aggregated tables don't support count_distinct
	if timeAggregation == metrictypes.TimeAggregationCountDistinct {
		return SamplesTableName
	}

	if end-start < oneMonthInMilliseconds+offsetBucket {
		return SamplesTableName
	}
	return SamplesAgg1dTableName

}

func AggregationColumnForSamplesTable(
	start, end uint64,
	metricType metrictypes.Type,
	temporality metrictypes.Temporality,
	timeAggregation metrictypes.TimeAggregation,
	tableHints *metrictypes.MetricTableHints,
) string {
	tableName := WhichSamplesTableToUse(start, end, metricType, timeAggregation, tableHints)
	var aggregationColumn string
	switch temporality {
	case metrictypes.Delta:
		switch tableName {
		case SamplesTableName:
			switch timeAggregation {
			case metrictypes.TimeAggregationLatest:
				aggregationColumn = "anyLast(value)"
			case metrictypes.TimeAggregationSum:
				aggregationColumn = "sum(value)"
			case metrictypes.TimeAggregationAvg:
				aggregationColumn = "avg(value)"
			case metrictypes.TimeAggregationMin:
				aggregationColumn = "min(value)"
			case metrictypes.TimeAggregationMax:
				aggregationColumn = "max(value)"
			case metrictypes.TimeAggregationCount:
				aggregationColumn = "count(value)"
			case metrictypes.TimeAggregationCountDistinct:
				aggregationColumn = "countDistinct(value)"
			case metrictypes.TimeAggregationRate, metrictypes.TimeAggregationIncrease: // only these two options give meaningful results
				aggregationColumn = "sum(value)"
			}
		case SamplesAgg1dTableName:
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
		}
	case metrictypes.Cumulative:
		switch tableName {
		case SamplesTableName:
			switch timeAggregation {
			case metrictypes.TimeAggregationLatest:
				aggregationColumn = "anyLast(value)"
			case metrictypes.TimeAggregationSum:
				aggregationColumn = "sum(value)"
			case metrictypes.TimeAggregationAvg:
				aggregationColumn = "avg(value)"
			case metrictypes.TimeAggregationMin:
				aggregationColumn = "min(value)"
			case metrictypes.TimeAggregationMax:
				aggregationColumn = "max(value)"
			case metrictypes.TimeAggregationCount:
				aggregationColumn = "count(value)"
			case metrictypes.TimeAggregationCountDistinct:
				aggregationColumn = "countDistinct(value)"
			case metrictypes.TimeAggregationRate, metrictypes.TimeAggregationIncrease: // only these two options give meaningful results
				aggregationColumn = "max(value)"
			}
		case SamplesAgg1dTableName:
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
		}

	case metrictypes.Unspecified:
		switch tableName {
		case SamplesTableName:
			switch timeAggregation {
			case metrictypes.TimeAggregationLatest:
				aggregationColumn = "anyLast(value)"
			case metrictypes.TimeAggregationSum:
				aggregationColumn = "sum(value)"
			case metrictypes.TimeAggregationAvg:
				aggregationColumn = "avg(value)"
			case metrictypes.TimeAggregationMin:
				aggregationColumn = "min(value)"
			case metrictypes.TimeAggregationMax:
				aggregationColumn = "max(value)"
			case metrictypes.TimeAggregationCount:
				aggregationColumn = "count(value)"
			case metrictypes.TimeAggregationCountDistinct:
				aggregationColumn = "countDistinct(value)"
			case metrictypes.TimeAggregationRate, metrictypes.TimeAggregationIncrease: // ideally, this should never happen
				aggregationColumn = "sum(value)"
			}
		case SamplesAgg1dTableName:
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

	}
	return aggregationColumn
}
