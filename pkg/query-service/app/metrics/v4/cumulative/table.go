package cumulative

import (
	"fmt"
	"math"

	v4 "go.signoz.io/signoz/pkg/query-service/app/metrics/v4"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

// This logic is little convoluted for a reason.
// When we work with cumulative metrics, the table view need to show the data for the entire time range.
// In some cases, we could take the points at the start and end of the time range and divide it by the
// duration. But, the problem is there could be resets.
// We can sum the rate of change for some interval X, this interval can be step size of time series.
// However, the speed of query depends on the number of timestamps, so we bump up the xx the step size.
// This should be a good balance between speed and accuracy.
// TODO: find a better way to do this
func stepForTable(start, end int64) int64 {
	// round up to the nearest multiple of 60
	duration := (end - start + 1) / 1000
	step := math.Max(math.Floor(float64(duration)/120), 60) // assuming 120 max points
	if duration > 1800 {                                    // bump for longer duration
		step = step * 5
	}
	return int64(step)
}

// prepareTimeAggregationSubQueryTable prepares the sub-query to be used for temporal aggregation
func prepareTimeAggregationSubQueryTable(start, end, _ int64, mq *v3.BuilderQuery) (string, error) {
	var subQuery string
	step := stepForTable(start, end)

	timeSeriesSubQuery, err := v4.PrepareTimeseriesFilterQuery(mq)
	if err != nil {
		return "", err
	}

	samplesTableFilter := fmt.Sprintf("metric_name = %s AND timestamp_ms >= %d AND timestamp_ms <= %d", utils.ClickHouseFormattedValue(mq.AggregateAttribute.Key), start, end)

	// Select the aggregate value for interval
	queryTmpl :=
		"SELECT fingerprint, %s" +
			" toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %d SECOND) as ts," +
			" %s as per_series_value" +
			" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_TABLENAME +
			" INNER JOIN" +
			" (%s) as filtered_time_series" +
			" USING fingerprint" +
			" WHERE " + samplesTableFilter +
			" GROUP BY fingerprint, ts" +
			" ORDER BY fingerprint, ts"

	var selectLabelsAny string
	for _, tag := range mq.GroupBy {
		selectLabelsAny += fmt.Sprintf("any(%s) as %s,", tag.Key, tag.Key)
	}

	var selectLabels string
	for _, tag := range mq.GroupBy {
		selectLabels += tag.Key + ","
	}

	switch mq.TimeAggregation {
	case v3.TimeAggregationAvg:
		op := "avg(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationSum:
		op := "sum(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationMin:
		op := "min(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationMax:
		op := "max(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationCount:
		op := "count(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationCountDistinct:
		op := "count(distinct(value))"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationAnyLast:
		op := "anyLast(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationRate:
		op := "max(value)"
		innerSubQuery := fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
		rateQueryTmpl :=
			"SELECT %s ts, " + rateWithoutNegative +
				" as per_series_value FROM(%s) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)"
		subQuery = fmt.Sprintf(rateQueryTmpl, selectLabels, innerSubQuery)
	case v3.TimeAggregationIncrease:
		op := "max(value)"
		innerSubQuery := fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
		rateQueryTmpl :=
			"SELECT %s ts, " + increaseWithoutNegative +
				" as per_series_value FROM(%s) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)"
		subQuery = fmt.Sprintf(rateQueryTmpl, selectLabels, innerSubQuery)
	}
	return subQuery, nil
}

// prepareMetricQueryTable prepares the query to be used for fetching metrics
func prepareMetricQueryTable(start, end, _ int64, mq *v3.BuilderQuery) (string, error) {
	var query string

	step := stepForTable(start, end)
	points := ((end - start + 1) / 1000) / step

	temporalAggSubQuery, err := prepareTimeAggregationSubQueryTable(start, end, step, mq)
	if err != nil {
		return "", err
	}

	groupBy := groupingSetsByAttributeKeyTags(mq.GroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)
	selectLabels := groupByAttributeKeyTags(mq.GroupBy...)

	queryTmpl :=
		"SELECT %s, toStartOfHour(now()) as ts, " +
			" %s as value" +
			" FROM (%s)" +
			" WHERE isNaN(per_series_value) = 0" +
			" GROUP BY %s" +
			" ORDER BY %s"

	switch mq.SpaceAggregation {
	case v3.SpaceAggregationAvg:
		op := "avg(per_series_value)"
		if mq.TimeAggregation == v3.TimeAggregationRate {
			op = "avg(per_series_value)/" + fmt.Sprintf("%d", points)
		}
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpaceAggregationSum:
		op := "sum(per_series_value)"
		if mq.TimeAggregation == v3.TimeAggregationRate {
			op = "sum(per_series_value)/" + fmt.Sprintf("%d", points)
		}
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpaceAggregationMin:
		op := "min(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpaceAggregationMax:
		op := "max(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpaceAggregationCount:
		op := "count(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	}

	return query, nil
}
