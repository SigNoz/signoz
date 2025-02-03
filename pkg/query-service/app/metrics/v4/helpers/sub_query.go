package helpers

import (
	"fmt"
	"strings"
	"time"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var (
	sixHoursInMilliseconds = time.Hour.Milliseconds() * 6
	oneDayInMilliseconds   = time.Hour.Milliseconds() * 24
	oneWeekInMilliseconds  = oneDayInMilliseconds * 7
)

func whichTSTableToUse(start, end int64, mq *v3.BuilderQuery) (int64, int64, string) {

	// if we have a hint for the table, we need to use it
	// the hint will be used to override the default table selection logic
	if mq.MetricTableHints != nil {
		if mq.MetricTableHints.TimeSeriesTableName != "" {
			switch mq.MetricTableHints.TimeSeriesTableName {
			case constants.SIGNOZ_TIMESERIES_v4_LOCAL_TABLENAME:
				// adjust the start time to nearest 1 hour
				start = start - (start % (time.Hour.Milliseconds() * 1))
			case constants.SIGNOZ_TIMESERIES_v4_6HRS_LOCAL_TABLENAME:
				// adjust the start time to nearest 6 hours
				start = start - (start % (time.Hour.Milliseconds() * 6))
			case constants.SIGNOZ_TIMESERIES_v4_1DAY_LOCAL_TABLENAME:
				// adjust the start time to nearest 1 day
				start = start - (start % (time.Hour.Milliseconds() * 24))
			case constants.SIGNOZ_TIMESERIES_v4_1WEEK_LOCAL_TABLENAME:
				// adjust the start time to nearest 1 week
				start = start - (start % (time.Hour.Milliseconds() * 24 * 7))
			}
			return start, end, mq.MetricTableHints.TimeSeriesTableName
		}
	}

	// If time range is less than 6 hours, we need to use the `time_series_v4` table
	// else if time range is less than 1 day and greater than 6 hours, we need to use the `time_series_v4_6hrs` table
	// else if time range is less than 1 week and greater than 1 day, we need to use the `time_series_v4_1day` table
	// else we need to use the `time_series_v4_1week` table
	var tableName string
	if end-start < sixHoursInMilliseconds {
		// adjust the start time to nearest 1 hour
		start = start - (start % (time.Hour.Milliseconds() * 1))
		tableName = constants.SIGNOZ_TIMESERIES_v4_LOCAL_TABLENAME
	} else if end-start < oneDayInMilliseconds {
		// adjust the start time to nearest 6 hours
		start = start - (start % (time.Hour.Milliseconds() * 6))
		tableName = constants.SIGNOZ_TIMESERIES_v4_6HRS_LOCAL_TABLENAME
	} else if end-start < oneWeekInMilliseconds {
		// adjust the start time to nearest 1 day
		start = start - (start % (time.Hour.Milliseconds() * 24))
		tableName = constants.SIGNOZ_TIMESERIES_v4_1DAY_LOCAL_TABLENAME
	} else {
		if constants.UseMetricsPreAggregation() {
			// adjust the start time to nearest 1 week
			start = start - (start % (time.Hour.Milliseconds() * 24 * 7))
			tableName = constants.SIGNOZ_TIMESERIES_v4_1WEEK_LOCAL_TABLENAME
		} else {
			// continue to use the 1 day table
			start = start - (start % (time.Hour.Milliseconds() * 24))
			tableName = constants.SIGNOZ_TIMESERIES_v4_1DAY_LOCAL_TABLENAME
		}
	}

	return start, end, tableName
}

// start and end are in milliseconds
// we have three tables for samples
// 1. distributed_samples_v4
// 2. distributed_samples_v4_agg_5m - for queries with time range above or equal to 1 day and less than 1 week
// 3. distributed_samples_v4_agg_30m - for queries with time range above or equal to 1 week
// if the `timeAggregation` is `count_distinct` we can't use the aggregated tables because they don't support it
func WhichSamplesTableToUse(start, end int64, mq *v3.BuilderQuery) string {

	// if we have a hint for the table, we need to use it
	// the hint will be used to override the default table selection logic
	if mq.MetricTableHints != nil {
		if mq.MetricTableHints.SamplesTableName != "" {
			return mq.MetricTableHints.SamplesTableName
		}
	}

	// we don't have any aggregated table for sketches (yet)
	if mq.AggregateAttribute.Type == v3.AttributeKeyType(v3.MetricTypeExponentialHistogram) {
		return constants.SIGNOZ_EXP_HISTOGRAM_TABLENAME
	}

	// continue to use the old table if pre-aggregation is disabled
	if !constants.UseMetricsPreAggregation() {
		return constants.SIGNOZ_SAMPLES_V4_TABLENAME
	}

	// if the time aggregation is count_distinct, we need to use the distributed_samples_v4 table
	// because the aggregated tables don't support count_distinct
	if mq.TimeAggregation == v3.TimeAggregationCountDistinct {
		return constants.SIGNOZ_SAMPLES_V4_TABLENAME
	}

	if end-start < oneDayInMilliseconds {
		// if we are dealing with delta metrics and interval is greater than 5 minutes, we can use the 5m aggregated table
		// why would interval be greater than 5 minutes?
		// we allow people to configure the step interval so we can make use of this
		if mq.Temporality == v3.Delta && mq.TimeAggregation == v3.TimeAggregationIncrease && mq.StepInterval >= 300 && mq.StepInterval < 1800 {
			return constants.SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME
		} else if mq.Temporality == v3.Delta && mq.TimeAggregation == v3.TimeAggregationIncrease && mq.StepInterval >= 1800 {
			// if we are dealing with delta metrics and interval is greater than 30 minutes, we can use the 30m aggregated table
			return constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME
		}
		return constants.SIGNOZ_SAMPLES_V4_TABLENAME
	} else if end-start < oneWeekInMilliseconds {
		return constants.SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME
	} else {
		return constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME
	}
}

func AggregationColumnForSamplesTable(start, end int64, mq *v3.BuilderQuery) string {
	tableName := WhichSamplesTableToUse(start, end, mq)
	var aggregationColumn string
	switch mq.Temporality {
	case v3.Delta:
		// for delta metrics, we only support `RATE`/`INCREASE` both of which are sum
		// although it doesn't make sense to use anyLast, avg, min, max, count on delta metrics,
		// we are keeping it here to make sure that query will not be invalid
		switch tableName {
		case constants.SIGNOZ_SAMPLES_V4_TABLENAME:
			switch mq.TimeAggregation {
			case v3.TimeAggregationAnyLast:
				aggregationColumn = "anyLast(value)"
			case v3.TimeAggregationSum:
				aggregationColumn = "sum(value)"
			case v3.TimeAggregationAvg:
				aggregationColumn = "avg(value)"
			case v3.TimeAggregationMin:
				aggregationColumn = "min(value)"
			case v3.TimeAggregationMax:
				aggregationColumn = "max(value)"
			case v3.TimeAggregationCount:
				aggregationColumn = "count(value)"
			case v3.TimeAggregationCountDistinct:
				aggregationColumn = "countDistinct(value)"
			case v3.TimeAggregationRate, v3.TimeAggregationIncrease: // only these two options give meaningful results
				aggregationColumn = "sum(value)"
			}
		case constants.SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME, constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME:
			switch mq.TimeAggregation {
			case v3.TimeAggregationAnyLast:
				aggregationColumn = "anyLast(last)"
			case v3.TimeAggregationSum:
				aggregationColumn = "sum(sum)"
			case v3.TimeAggregationAvg:
				aggregationColumn = "sum(sum) / sum(count)"
			case v3.TimeAggregationMin:
				aggregationColumn = "min(min)"
			case v3.TimeAggregationMax:
				aggregationColumn = "max(max)"
			case v3.TimeAggregationCount:
				aggregationColumn = "sum(count)"
			// count_distinct is not supported in aggregated tables
			case v3.TimeAggregationRate, v3.TimeAggregationIncrease: // only these two options give meaningful results
				aggregationColumn = "sum(sum)"
			}
		}
	case v3.Cumulative:
		// for cumulative metrics, we only support `RATE`/`INCREASE`. The max value in window is
		// used to calculate the sum which is then divided by the window size to get the rate
		switch tableName {
		case constants.SIGNOZ_SAMPLES_V4_TABLENAME:
			switch mq.TimeAggregation {
			case v3.TimeAggregationAnyLast:
				aggregationColumn = "anyLast(value)"
			case v3.TimeAggregationSum:
				aggregationColumn = "sum(value)"
			case v3.TimeAggregationAvg:
				aggregationColumn = "avg(value)"
			case v3.TimeAggregationMin:
				aggregationColumn = "min(value)"
			case v3.TimeAggregationMax:
				aggregationColumn = "max(value)"
			case v3.TimeAggregationCount:
				aggregationColumn = "count(value)"
			case v3.TimeAggregationCountDistinct:
				aggregationColumn = "countDistinct(value)"
			case v3.TimeAggregationRate, v3.TimeAggregationIncrease: // only these two options give meaningful results
				aggregationColumn = "max(value)"
			}
		case constants.SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME, constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME:
			switch mq.TimeAggregation {
			case v3.TimeAggregationAnyLast:
				aggregationColumn = "anyLast(last)"
			case v3.TimeAggregationSum:
				aggregationColumn = "sum(sum)"
			case v3.TimeAggregationAvg:
				aggregationColumn = "sum(sum) / sum(count)"
			case v3.TimeAggregationMin:
				aggregationColumn = "min(min)"
			case v3.TimeAggregationMax:
				aggregationColumn = "max(max)"
			case v3.TimeAggregationCount:
				aggregationColumn = "sum(count)"
			// count_distinct is not supported in aggregated tables
			case v3.TimeAggregationRate, v3.TimeAggregationIncrease: // only these two options give meaningful results
				aggregationColumn = "max(max)"
			}
		}
	case v3.Unspecified:
		switch tableName {
		case constants.SIGNOZ_SAMPLES_V4_TABLENAME:
			switch mq.TimeAggregation {
			case v3.TimeAggregationAnyLast:
				aggregationColumn = "anyLast(value)"
			case v3.TimeAggregationSum:
				aggregationColumn = "sum(value)"
			case v3.TimeAggregationAvg:
				aggregationColumn = "avg(value)"
			case v3.TimeAggregationMin:
				aggregationColumn = "min(value)"
			case v3.TimeAggregationMax:
				aggregationColumn = "max(value)"
			case v3.TimeAggregationCount:
				aggregationColumn = "count(value)"
			case v3.TimeAggregationCountDistinct:
				aggregationColumn = "countDistinct(value)"
			case v3.TimeAggregationRate, v3.TimeAggregationIncrease: // ideally, this should never happen
				aggregationColumn = "sum(value)"
			}
		case constants.SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME, constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME:
			switch mq.TimeAggregation {
			case v3.TimeAggregationAnyLast:
				aggregationColumn = "anyLast(last)"
			case v3.TimeAggregationSum:
				aggregationColumn = "sum(sum)"
			case v3.TimeAggregationAvg:
				aggregationColumn = "sum(sum) / sum(count)"
			case v3.TimeAggregationMin:
				aggregationColumn = "min(min)"
			case v3.TimeAggregationMax:
				aggregationColumn = "max(max)"
			case v3.TimeAggregationCount:
				aggregationColumn = "sum(count)"
			// count_distinct is not supported in aggregated tables
			case v3.TimeAggregationRate, v3.TimeAggregationIncrease: // ideally, this should never happen
				aggregationColumn = "sum(sum)"
			}
		}
	}
	return aggregationColumn
}

// PrepareTimeseriesFilterQuery builds the sub-query to be used for filtering timeseries based on the search criteria
func PrepareTimeseriesFilterQuery(start, end int64, mq *v3.BuilderQuery) (string, error) {
	var conditions []string
	var fs *v3.FilterSet = mq.Filters
	var groupTags []v3.AttributeKey = mq.GroupBy

	conditions = append(conditions, fmt.Sprintf("metric_name IN %s", utils.ClickHouseFormattedMetricNames(mq.AggregateAttribute.Key)))
	conditions = append(conditions, fmt.Sprintf("temporality = '%s'", mq.Temporality))

	start, end, tableName := whichTSTableToUse(start, end, mq)

	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", start, end))

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			if item.Key.Key == "__value" {
				continue
			}

			toFormat := item.Value
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
			if op == v3.FilterOperatorContains || op == v3.FilterOperatorNotContains {
				toFormat = fmt.Sprintf("%%%s%%", toFormat)
			}
			var fmtVal string
			if op != v3.FilterOperatorExists && op != v3.FilterOperatorNotExists {
				fmtVal = utils.ClickHouseFormattedValue(toFormat)
			}
			switch op {
			case v3.FilterOperatorEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') = %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') != %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') NOT IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLike:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotLike:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorRegex:
				conditions = append(conditions, fmt.Sprintf("match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotRegex:
				conditions = append(conditions, fmt.Sprintf("not match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') > %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') >= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') < %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') <= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorContains:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotContains:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorExists:
				conditions = append(conditions, fmt.Sprintf("has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			case v3.FilterOperatorNotExists:
				conditions = append(conditions, fmt.Sprintf("not has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			default:
				return "", fmt.Errorf("unsupported filter operator")
			}
		}
	}
	whereClause := strings.Join(conditions, " AND ")

	var selectLabels string
	for _, tag := range groupTags {
		selectLabels += fmt.Sprintf("JSONExtractString(labels, '%s') as %s, ", tag.Key, utils.AddBackTickToFormatTag(tag.Key))
	}

	// The table JOIN key always exists
	selectLabels += "fingerprint"

	filterSubQuery := fmt.Sprintf(
		"SELECT DISTINCT %s FROM %s.%s WHERE %s",
		selectLabels,
		constants.SIGNOZ_METRIC_DBNAME,
		tableName,
		whereClause,
	)

	return filterSubQuery, nil
}

// PrepareTimeseriesFilterQuery builds the sub-query to be used for filtering timeseries based on the search criteria
func PrepareTimeseriesFilterQueryV3(start, end int64, mq *v3.BuilderQuery) (string, error) {
	var conditions []string
	var fs *v3.FilterSet = mq.Filters
	var groupTags []v3.AttributeKey = mq.GroupBy

	conditions = append(conditions, fmt.Sprintf("metric_name IN %s", utils.ClickHouseFormattedMetricNames(mq.AggregateAttribute.Key)))
	conditions = append(conditions, fmt.Sprintf("temporality = '%s'", mq.Temporality))

	start, end, tableName := whichTSTableToUse(start, end, mq)

	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", start, end))

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			toFormat := item.Value
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
			if op == v3.FilterOperatorContains || op == v3.FilterOperatorNotContains {
				toFormat = fmt.Sprintf("%%%s%%", toFormat)
			}
			fmtVal := utils.ClickHouseFormattedValue(toFormat)
			switch op {
			case v3.FilterOperatorEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') = %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') != %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') NOT IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLike:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotLike:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorRegex:
				conditions = append(conditions, fmt.Sprintf("match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotRegex:
				conditions = append(conditions, fmt.Sprintf("not match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') > %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') >= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') < %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') <= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorContains:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotContains:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorExists:
				conditions = append(conditions, fmt.Sprintf("has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			case v3.FilterOperatorNotExists:
				conditions = append(conditions, fmt.Sprintf("not has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			default:
				return "", fmt.Errorf("unsupported filter operator")
			}
		}
	}
	whereClause := strings.Join(conditions, " AND ")

	var selectLabels string

	if mq.AggregateOperator == v3.AggregateOperatorNoOp || mq.AggregateOperator == v3.AggregateOperatorRate {
		selectLabels += "labels, "
	} else {
		for _, tag := range groupTags {
			selectLabels += fmt.Sprintf("JSONExtractString(labels, '%s') as %s, ", tag.Key, utils.AddBackTickToFormatTag(tag.Key))
		}
	}

	// The table JOIN key always exists
	selectLabels += "fingerprint"

	filterSubQuery := fmt.Sprintf(
		"SELECT DISTINCT %s FROM %s.%s WHERE %s",
		selectLabels,
		constants.SIGNOZ_METRIC_DBNAME,
		tableName,
		whereClause,
	)

	return filterSubQuery, nil
}
