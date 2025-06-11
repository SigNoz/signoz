package telemetrymetrics

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

const (
	DBName                           = "signoz_metrics"
	SamplesV4TableName               = "distributed_samples_v4"
	SamplesV4LocalTableName          = "samples_v4"
	SamplesV4Agg5mTableName          = "distributed_samples_v4_agg_5m"
	SamplesV4Agg5mLocalTableName     = "samples_v4_agg_5m"
	SamplesV4Agg30mTableName         = "distributed_samples_v4_agg_30m"
	SamplesV4Agg30mLocalTableName    = "samples_v4_agg_30m"
	ExpHistogramTableName            = "distributed_exp_hist"
	ExpHistogramLocalTableName       = "exp_hist"
	TimeseriesV4TableName            = "distributed_time_series_v4"
	TimeseriesV4LocalTableName       = "time_series_v4"
	TimeseriesV46hrsTableName        = "distributed_time_series_v4_6hrs"
	TimeseriesV46hrsLocalTableName   = "time_series_v4_6hrs"
	TimeseriesV41dayTableName        = "distributed_time_series_v4_1day"
	TimeseriesV41dayLocalTableName   = "time_series_v4_1day"
	TimeseriesV41weekTableName       = "distributed_time_series_v4_1week"
	TimeseriesV41weekLocalTableName  = "time_series_v4_1week"
	AttributesMetadataTableName      = "distributed_metadata"
	AttributesMetadataLocalTableName = "metadata"
)

var (
	oneHourInMilliseconds  = uint64(time.Hour.Milliseconds() * 1)
	sixHoursInMilliseconds = uint64(time.Hour.Milliseconds() * 6)
	oneDayInMilliseconds   = uint64(time.Hour.Milliseconds() * 24)
	oneWeekInMilliseconds  = uint64(oneDayInMilliseconds * 7)

	// when the query requests for almost 1 day, but not exactly 1 day, we need to add an offset to the end time
	// to make sure that we are using the correct table
	// this is because the start gets adjusted to the nearest step interval and uses the 5m table for 4m step interval
	// leading to time series that doesn't best represent the rate of change
	offsetBucket = uint64(60 * time.Minute.Milliseconds())
)

func WhichTSTableToUse(
	start, end uint64,
	tableHints *metrictypes.MetricTableHints,
) (uint64, uint64, string) {
	// if we have a hint for the table, we need to use it
	// the hint will be used to override the default table selection logic
	if tableHints != nil {
		if tableHints.TimeSeriesTableName != "" {
			switch tableHints.TimeSeriesTableName {
			case TimeseriesV4LocalTableName:
				// adjust the start time to nearest 1 hour
				start = start - (start % (oneHourInMilliseconds))
			case TimeseriesV46hrsLocalTableName:
				// adjust the start time to nearest 6 hours
				start = start - (start % (sixHoursInMilliseconds))
			case TimeseriesV41dayLocalTableName:
				// adjust the start time to nearest 1 day
				start = start - (start % (oneDayInMilliseconds))
			case TimeseriesV41weekLocalTableName:
				// adjust the start time to nearest 1 week
				start = start - (start % (oneWeekInMilliseconds))
			}
			return start, end, tableHints.TimeSeriesTableName
		}
	}

	// If time range is less than 6 hours, we need to use the `time_series_v4` table
	// else if time range is less than 1 day and greater than 6 hours, we need to use the `time_series_v4_6hrs` table
	// else if time range is less than 1 week and greater than 1 day, we need to use the `time_series_v4_1day` table
	// else we need to use the `time_series_v4_1week` table
	var tableName string
	if end-start < sixHoursInMilliseconds {
		// adjust the start time to nearest 1 hour
		start = start - (start % (oneHourInMilliseconds))
		tableName = TimeseriesV4LocalTableName
	} else if end-start < oneDayInMilliseconds {
		// adjust the start time to nearest 6 hours
		start = start - (start % (sixHoursInMilliseconds))
		tableName = TimeseriesV46hrsLocalTableName
	} else if end-start < oneWeekInMilliseconds {
		// adjust the start time to nearest 1 day
		start = start - (start % (oneDayInMilliseconds))
		tableName = TimeseriesV41dayLocalTableName
	} else {
		// adjust the start time to nearest 1 week
		start = start - (start % (oneWeekInMilliseconds))
		tableName = TimeseriesV41weekLocalTableName
	}

	return start, end, tableName
}

// start and end are in milliseconds
// we have three tables for samples
// 1. distributed_samples_v4
// 2. distributed_samples_v4_agg_5m - for queries with time range above or equal to 1 day and less than 1 week
// 3. distributed_samples_v4_agg_30m - for queries with time range above or equal to 1 week
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

	// we don't have any aggregated table for sketches (yet)
	if metricType == metrictypes.ExpHistogramType {
		return ExpHistogramLocalTableName
	}

	// if the time aggregation is count_distinct, we need to use the distributed_samples_v4 table
	// because the aggregated tables don't support count_distinct
	if timeAggregation == metrictypes.TimeAggregationCountDistinct {
		return SamplesV4TableName
	}

	if end-start < oneDayInMilliseconds+offsetBucket {
		return SamplesV4TableName
	} else if end-start < oneWeekInMilliseconds+offsetBucket {
		return SamplesV4Agg5mTableName
	} else {
		return SamplesV4Agg30mTableName
	}
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
		// for delta metrics, we only support `RATE`/`INCREASE` both of which are sum
		// although it doesn't make sense to use anyLast, avg, min, max, count on delta metrics,
		// we are keeping it here to make sure that query will not be invalid
		switch tableName {
		case SamplesV4TableName:
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
		case SamplesV4Agg5mTableName, SamplesV4Agg30mTableName:
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
		// for cumulative metrics, we only support `RATE`/`INCREASE`. The max value in window is
		// used to calculate the sum which is then divided by the window size to get the rate
		switch tableName {
		case SamplesV4TableName:
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
		case SamplesV4Agg5mTableName, SamplesV4Agg30mTableName:
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
		case SamplesV4TableName:
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
		case SamplesV4Agg5mTableName, SamplesV4Agg30mTableName:
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
