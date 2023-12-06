package cumulative

import (
	"fmt"

	v4 "go.signoz.io/signoz/pkg/query-service/app/metrics/v4"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

const (
	rateWithoutNegative     = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)))`
	increaseWithoutNegative = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window)))`
)

// prepareTimeAggregationSubQueryTimeSeries prepares the sub-query to be used for temporal aggregation
func prepareTimeAggregationSubQueryTimeSeries(start, end, step int64, mq *v3.BuilderQuery) (string, error) {
	var subQuery string

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
				" as per_series_value FROM (%s) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)"
		subQuery = fmt.Sprintf(rateQueryTmpl, selectLabels, innerSubQuery)
	case v3.TimeAggregationIncrease:
		op := "max(value)"
		innerSubQuery := fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
		rateQueryTmpl :=
			"SELECT %s ts, " + increaseWithoutNegative +
				" as per_series_value FROM (%s) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)"
		subQuery = fmt.Sprintf(rateQueryTmpl, selectLabels, innerSubQuery)
	}
	return subQuery, nil
}

// prepareMetricQueryCumulativeTimeSeries prepares the query to be used for fetching metrics
func prepareMetricQueryCumulativeTimeSeries(start, end, step int64, mq *v3.BuilderQuery) (string, error) {
	var query string

	temporalAggSubQuery, err := prepareTimeAggregationSubQueryTimeSeries(start, end, step, mq)
	if err != nil {
		return "", err
	}

	groupBy := groupingSetsByAttributeKeyTags(mq.GroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)
	selectLabels := groupByAttributeKeyTags(mq.GroupBy...)

	queryTmpl :=
		"SELECT %s," +
			" %s as value" +
			" FROM (%s)" +
			" WHERE isNaN(per_series_value) = 0" +
			" GROUP BY %s" +
			" ORDER BY %s"

	switch mq.SpaceAggregation {
	case v3.SpaceAggregationAvg:
		op := "avg(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpaceAggregationSum:
		op := "sum(per_series_value)"
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
