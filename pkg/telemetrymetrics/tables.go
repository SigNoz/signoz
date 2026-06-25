package telemetrymetrics

import (
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

const (
	DBName                           = "signoz_metrics"
	UpdatedMetadataTableName         = "distributed_updated_metadata"
	UpdatedMetadataLocalTableName    = "updated_metadata"
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

	// The buffer holds raw points for ~24h; the reduced tables hold 60s
	// aggregates of dropped-label series.
	SamplesV4BufferTableName          = "distributed_samples_v4_buffer"
	SamplesV4BufferLocalTableName     = "samples_v4_buffer"
	TimeseriesV4BufferTableName       = "distributed_time_series_v4_buffer"
	TimeseriesV4BufferLocalTableName  = "time_series_v4_buffer"
	SamplesV4ReducedLastTableName     = "distributed_samples_v4_reduced_last_60s"
	SamplesV4ReducedSumTableName      = "distributed_samples_v4_reduced_sum_60s"
	TimeseriesV4ReducedTableName      = "distributed_time_series_v4_reduced"
	TimeseriesV4ReducedLocalTableName = "time_series_v4_reduced"

	ReductionRulesTableName = "distributed_metric_reduction_rules"
)

var (
	oneHourInMilliseconds  = uint64(time.Hour.Milliseconds() * 1)
	sixHoursInMilliseconds = uint64(time.Hour.Milliseconds() * 6)
	oneDayInMilliseconds   = uint64(time.Hour.Milliseconds() * 24)
	oneWeekInMilliseconds  = uint64(oneDayInMilliseconds * 7)

	// when the query requests for almost 1 day, but not exactly 1 day, we need to add an offset to the end time
	// to make sure that we are using the correct table
	// this is because the start gets adjusted to the nearest step interval and uses the 5m table for 4m step interval
	// leading to time series that doesn't best represent the rate of change.
	offsetBucket = uint64(60 * time.Minute.Milliseconds())
)

// WhichTSTableToUse returns adjusted start, adjusted end, distributed table name, local table name
// in that order.
func WhichTSTableToUse(
	start, end uint64,
	useBuffer bool,
	tableHints *metrictypes.MetricTableHints,
) (uint64, uint64, string, string) {
	// the buffer holds the recent raw window for reduced metrics and has the same
	// shape as time_series_v4; round the start to the hour like the v4 table.
	if useBuffer {
		start = start - (start % (oneHourInMilliseconds))
		return start, end, TimeseriesV4BufferTableName, TimeseriesV4BufferLocalTableName
	}

	// if we have a hint for the table, we need to use it
	// the hint will be used to override the default table selection logic
	if tableHints != nil {
		if tableHints.TimeSeriesTableName != "" {
			var distributedTableName string
			switch tableHints.TimeSeriesTableName {
			case TimeseriesV4LocalTableName:
				// adjust the start time to nearest 1 hour
				start = start - (start % (oneHourInMilliseconds))
				distributedTableName = TimeseriesV4TableName
			case TimeseriesV46hrsLocalTableName:
				// adjust the start time to nearest 6 hours
				start = start - (start % (sixHoursInMilliseconds))
				distributedTableName = TimeseriesV46hrsTableName
			case TimeseriesV41dayLocalTableName:
				// adjust the start time to nearest 1 day
				start = start - (start % (oneDayInMilliseconds))
				distributedTableName = TimeseriesV41dayTableName
			case TimeseriesV41weekLocalTableName:
				// adjust the start time to nearest 1 week
				start = start - (start % (oneWeekInMilliseconds))
				distributedTableName = TimeseriesV41weekTableName
			}
			return start, end, distributedTableName, tableHints.TimeSeriesTableName
		}
	}

	// If time range is less than 6 hours, we need to use the `time_series_v4` table
	// else if time range is less than 1 day and greater than 6 hours, we need to use the `time_series_v4_6hrs` table
	// else if time range is less than 1 week and greater than 1 day, we need to use the `time_series_v4_1day` table
	// else we need to use the `time_series_v4_1week` table
	var distributedTableName string
	var localTableName string
	if end-start < sixHoursInMilliseconds {
		// adjust the start time to nearest 1 hour
		start = start - (start % (oneHourInMilliseconds))
		distributedTableName = TimeseriesV4TableName
		localTableName = TimeseriesV4LocalTableName
	} else if end-start < oneDayInMilliseconds {
		// adjust the start time to nearest 6 hours
		start = start - (start % (sixHoursInMilliseconds))
		distributedTableName = TimeseriesV46hrsTableName
		localTableName = TimeseriesV46hrsLocalTableName
	} else if end-start < oneWeekInMilliseconds {
		// adjust the start time to nearest 1 day
		start = start - (start % (oneDayInMilliseconds))
		distributedTableName = TimeseriesV41dayTableName
		localTableName = TimeseriesV41dayLocalTableName
	} else {
		// adjust the start time to nearest 1 week
		start = start - (start % (oneWeekInMilliseconds))
		distributedTableName = TimeseriesV41weekTableName
		localTableName = TimeseriesV41weekLocalTableName
	}

	return start, end, distributedTableName, localTableName
}

// CountExpressionForSamplesTable returns the count expression for a given samples table name.
// For non-aggregated tables (distributed_samples_v4, exp_hist), it returns "count(*)".
// For aggregated tables (distributed_samples_v4_agg_5m, distributed_samples_v4_agg_30m), it returns "sum(count)".
func CountExpressionForSamplesTable(tableName string) string {
	// Non-aggregated tables use count(*)
	if tableName == SamplesV4TableName ||
		tableName == SamplesV4LocalTableName ||
		tableName == ExpHistogramTableName ||
		tableName == ExpHistogramLocalTableName {
		return "count(*)"
	}
	// Aggregated tables use sum(count)
	return "sum(count)"
}

// ValueColumnForSamplesTable returns the column name holding the sample value:
// "last" for the 5m/30m aggregated tables, "value" otherwise.
// note all the other columns in the aggregated samples tables are nothing but aggregations.
// and so "last" is the value column for these tables.
func ValueColumnForSamplesTable(tableName string) string {
	if tableName == SamplesV4Agg5mTableName || tableName == SamplesV4Agg30mTableName {
		return "last"
	}
	return "value"
}

// WhichSamplesTableToUse returns the distributed and local samples table names
// (in that order) appropriate for the given window, metric type, and time aggregation.
//
// start and end are in milliseconds. We have three tables for samples:
//  1. distributed_samples_v4
//  2. distributed_samples_v4_agg_5m — for queries with time range >= 1 day and < 1 week
//  3. distributed_samples_v4_agg_30m — for queries with time range >= 1 week
//
// If the `timeAggregation` is `count_distinct` we can't use the aggregated tables
// because they don't support it.
func WhichSamplesTableToUse(
	start, end uint64,
	metricType metrictypes.Type,
	timeAggregation metrictypes.TimeAggregation,
	useBuffer bool,
	tableHints *metrictypes.MetricTableHints,
) (string, string) {
	// the buffer holds the recent raw window for reduced metrics; same shape as samples_v4
	if useBuffer {
		return SamplesV4BufferTableName, SamplesV4BufferLocalTableName
	}

	// if we have a hint for the table, we need to use it
	// the hint will be used to override the default table selection logic.
	// SamplesTableName is the distributed name; derive the local via switch.
	if tableHints != nil && tableHints.SamplesTableName != "" {
		switch tableHints.SamplesTableName {
		case SamplesV4TableName, SamplesV4BufferTableName:
			return SamplesV4TableName, SamplesV4LocalTableName
		case SamplesV4Agg5mTableName:
			return SamplesV4Agg5mTableName, SamplesV4Agg5mLocalTableName
		case SamplesV4Agg30mTableName:
			return SamplesV4Agg30mTableName, SamplesV4Agg30mLocalTableName
		case ExpHistogramTableName:
			return ExpHistogramTableName, ExpHistogramLocalTableName
		}
		return tableHints.SamplesTableName, tableHints.SamplesTableName
	}

	// we don't have any aggregated table for sketches (yet)
	if metricType == metrictypes.ExpHistogramType {
		return ExpHistogramTableName, ExpHistogramLocalTableName
	}

	// if the time aggregation is count_distinct, we need to use the distributed_samples_v4 table
	// because the aggregated tables don't support count_distinct
	if timeAggregation == metrictypes.TimeAggregationCountDistinct {
		return SamplesV4TableName, SamplesV4LocalTableName
	}

	if end-start < oneDayInMilliseconds+offsetBucket {
		return SamplesV4TableName, SamplesV4LocalTableName
	} else if end-start < oneWeekInMilliseconds+offsetBucket {
		return SamplesV4Agg5mTableName, SamplesV4Agg5mLocalTableName
	}
	return SamplesV4Agg30mTableName, SamplesV4Agg30mLocalTableName
}

func AggregationColumnForSamplesTable(
	tableName string,
	temporality metrictypes.Temporality,
	timeAggregation metrictypes.TimeAggregation,
) (string, error) {
	var aggregationColumn string
	switch temporality {
	case metrictypes.Delta:
		// for delta metrics, we only support `RATE`/`INCREASE` both of which are sum
		// although it doesn't make sense to use anyLast, avg, min, max, count on delta metrics,
		// we are keeping it here to make sure that query will not be invalid
		switch tableName {
		case SamplesV4TableName, SamplesV4BufferTableName:
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
		case SamplesV4TableName, SamplesV4BufferTableName:
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
		case SamplesV4TableName, SamplesV4BufferTableName:
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
	if aggregationColumn == "" {
		return "", errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time aggregation, should be one of the following: [`latest`, `sum`, `avg`, `min`, `max`, `count`, `rate`, `increase`]",
		)
	}
	return aggregationColumn, nil
}

// WhichReducedSamplesTableToUse returns the 60s reduced samples table for a metric
// type: the last_60s table for gauge-like series, the sum_60s table for counters
// and histograms.
func WhichReducedSamplesTableToUse(metricType metrictypes.Type) string {
	if metricType == metrictypes.SumType || metricType == metrictypes.HistogramType {
		return SamplesV4ReducedSumTableName
	}
	return SamplesV4ReducedLastTableName
}

// ReducedValueColumn returns the reduced value column (and the avg-denominator
// weight) for a space aggregation. The reduced columns are pre-aggregated across
// the original series, so the space aggregation picks the underlying value; the
// sum table only has `sum`, so min/max across series have no column (ok=false).
func ReducedValueColumn(metricType metrictypes.Type, space metrictypes.SpaceAggregation) (value, weight string, ok bool) {
	if metricType == metrictypes.SumType || metricType == metrictypes.HistogramType {
		switch space {
		case metrictypes.SpaceAggregationSum:
			return "`sum`", "", true
		case metrictypes.SpaceAggregationAvg:
			return "`sum`", "`count_series`", true
		}
		return "", "", false
	}
	switch space {
	case metrictypes.SpaceAggregationSum:
		return "`sum_last`", "", true
	case metrictypes.SpaceAggregationAvg:
		return "`sum_last`", "`count_series`", true
	case metrictypes.SpaceAggregationMin:
		return "`min`", "", true
	case metrictypes.SpaceAggregationMax:
		return "`max`", "", true
	}
	return "", "", false
}

// ReducedTimeAggregationColumn applies the time aggregation to the reduced `value`
// column over the step's 60s buckets. latest uses argMax over the bucket timestamp
// (the buckets have no read order); rate divides the per-step sum by the step.
func ReducedTimeAggregationColumn(timeAggregation metrictypes.TimeAggregation, stepSec int64) string {
	switch timeAggregation {
	case metrictypes.TimeAggregationLatest:
		return "argMax(value, unix_milli)"
	case metrictypes.TimeAggregationAvg:
		return "avg(value)"
	case metrictypes.TimeAggregationMin:
		return "min(value)"
	case metrictypes.TimeAggregationMax:
		return "max(value)"
	case metrictypes.TimeAggregationCount:
		return "count(value)"
	case metrictypes.TimeAggregationRate:
		return fmt.Sprintf("sum(value) / %d", stepSec)
	default: // sum, increase
		return "sum(value)"
	}
}

func AggregationQueryForHistogramCountWithParams(param *metrictypes.ComparisonSpaceAggregationParam) (string, error) {
	if param == nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "no aggregation param provided for histogram count")
	}
	histogramCountThreshold := param.Threshold

	switch param.Operater {
	case "<=":
		return fmt.Sprintf("argMaxIf(value, toFloat64(le), toFloat64(le) <= %f) + (argMinIf(value, toFloat64(le), toFloat64(le) > %f) - argMaxIf(value, toFloat64(le), toFloat64(le) <= %f)) * (%f - maxIf(toFloat64(le), toFloat64(le) <= %f)) / (minIf(toFloat64(le), toFloat64(le) > %f) - maxIf(toFloat64(le), toFloat64(le) <= %f)) AS value", histogramCountThreshold, histogramCountThreshold, histogramCountThreshold, histogramCountThreshold, histogramCountThreshold, histogramCountThreshold, histogramCountThreshold), nil
	case ">":
		return fmt.Sprintf("argMax(value, toFloat64(le)) - (argMaxIf(value, toFloat64(le), toFloat64(le) <= %f) + (argMinIf(value, toFloat64(le), toFloat64(le) > %f) - argMaxIf(value, toFloat64(le), toFloat64(le) <= %f)) * (%f - maxIf(toFloat64(le), toFloat64(le) <= %f)) / (minIf(toFloat64(le), toFloat64(le) > %f) - maxIf(toFloat64(le), toFloat64(le) <= %f))) AS value", histogramCountThreshold, histogramCountThreshold, histogramCountThreshold, histogramCountThreshold, histogramCountThreshold, histogramCountThreshold, histogramCountThreshold), nil
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid space aggregation operator, should be one of the following: [`<=`, `>`]")
	}

}
