package cumulative

import (
	"fmt"
	"os"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

// See https://clickhouse.com/docs/en/sql-reference/window-functions for more details on `lagInFrame` function
//
// Calculating the rate of change of a metric is a common use case.
// Requests and errors are two examples of metrics that are often expressed as a rate of change.
// The rate of change is the difference between the current value and the previous value divided by
// the time difference between the current and previous values (i.e. the time interval).
//
// The value of a cumulative counter always increases. However, the rate of change can be negative
// if the value decreases between two samples. This can happen if the counter is reset when the
// application restarts or if the counter is reset manually. In this case, the rate of change is
// not meaningful and should be ignored.
//
// The condition `(per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0`
// checks if the rate of change is negative. If it is negative, the value is replaced with `nan`.
//
// The condition `ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400` checks
// if the time difference between the current and previous values is greater than or equal to 1 day.
// The first sample of a metric is always `nan` because there is no previous value to compare it to.
// When the first sample is encountered, the previous value for the time is set to default i.e `1970-01-01`.
// Since any difference between the first sample timestamp and the previous value timestamp will be
// greater than or equal to 1 day, the rate of change for the first sample will be `nan`.
//
// If neither of the above conditions are true, the rate of change is calculated as
// `(per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)`
// where `rate_window` is a window function that partitions the data by fingerprint and orders it by timestamp.
// We want to calculate the rate of change for each time series, so we partition the data by fingerprint.
//
// The `increase` function is similar to the `rate` function, except that it does not divide by the time interval.
const (
	rateWithoutNegative     = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)))`
	increaseWithoutNegative = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window)))`

	experimentalRateWithoutNegative     = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, per_series_value, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(%d))) OVER rate_window))`
	experimentalIncreaseWithoutNegative = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, per_series_value, ((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(%d))) OVER rate_window)) * (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(%d))) OVER rate_window))`
)

// prepareTimeAggregationSubQueryTimeSeries prepares the sub-query to be used for temporal aggregation
// of time series data

// The following example illustrates how the sub-query is used to calculate the sume of values for each
// time series in a 15 seconds interval:

// ```
// timestamp    01.00  01.05  01.10  01.15  01.20  01.25  01.30  01.35  01.40
//             +------+------+------+------+------+------+------+------+------+
//             |      |      |      |      |      |      |      |      |      |
//             |  v1  |  v2  |  v3  |  v4  |  v5  |  v6  | v7   |  v8  |  v9  |
//             |      |      |      |      |      |      |      |      |      |
//             +------+------+------+------+------+------+------+------+------+
//                |      |      |      |      |      |       |     |      |
//                  |    |    |          |    |    |           |   |    |
//                       |                    |                    |
//                    +------+             +------+            +------+
//                    | v1+  |             |  v4+ |            |  v7+ |
//                    | v2+  |             |  v5+ |            |  v8+ |
//                    | v3   |             |  v6  |            |  v9  |
//                    +------+             +------+            +------+
//                     01.00                01.15               01.30
// ```

// Calculating the rate/increase involves an additional step. We first calculate the maximum value for each time series
// in a 15 seconds interval. Then, we calculate the difference between the current maximum value and the previous
// maximum value

// The following example illustrates how the sub-query is used to calculate the rate of change for each time series
// in a 15 seconds interval:

// ```
// timestamp    01.00  01.05  01.10  01.15  01.20  01.25  01.30  01.35  01.40
//             +------+------+------+------+------+------+------+------+------+
//             |      |      |      |      |      |      |      |      |      |
//             |  v1  |  v2  |  v3  |  v4  |  v5  |  v6  | v7   |  v8  |  v9  |
//             |      |      |      |      |      |      |      |      |      |
//             +------+------+------+------+------+------+------+------+------+
//                |      |      |      |      |      |       |     |      |
//                  |    |    |          |    |    |           |   |    |
//                       |                    |                    |
//                    +------+             +------+            +------+
//                max(| v1,  |         max(|  v4, |        max(|  v7, |
//                    | v2,  |             |  v5, |            |  v8, |
//                    | v3   |)            |  v6  |)           |  v9  |)
//                    +------+             +------+            +------+
//                     01.00                01.15               01.30

//                              +-------+             +--------+
//                              | V6-V2 |             |  V9-V6 |
//                              |       |             |        |
//                              |       |             |        |
//                              +------+              +--------+
//                                01.00                  01.15
// ```

// The rate of change is calculated as (Vy - Vx) / (Ty - Tx) where Vx and Vy are the values at time Tx and Ty respectively.
// In an ideal scenario, the last value of each interval could be used to calculate the rate of change. Instead, we use
// the maximum value of each interval to calculate the rate of change. This is because any process restart can cause the
// value to be reset to 0. This will produce an inaccurate result. The max is the best approximation we can get.
// We don't expect the process to restart very often, so this should be a good approximation.

func prepareTimeAggregationSubQuery(start, end, step int64, mq *v3.BuilderQuery) (string, error) {
	var subQuery string

	timeSeriesSubQuery, err := helpers.PrepareTimeseriesFilterQuery(start, end, mq)
	if err != nil {
		return "", err
	}

	samplesTableFilter := fmt.Sprintf("metric_name IN %s AND unix_milli >= %d AND unix_milli < %d", utils.ClickHouseFormattedMetricNames(mq.AggregateAttribute.Key), start, end)

	tableName := helpers.WhichSamplesTableToUse(start, end, mq)

	// Select the aggregate value for interval
	queryTmpl :=
		"SELECT fingerprint, %s" +
			" toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL %d SECOND) as ts," +
			" %s as per_series_value" +
			" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + tableName +
			" INNER JOIN" +
			" (%s) as filtered_time_series" +
			" USING fingerprint" +
			" WHERE " + samplesTableFilter +
			" GROUP BY fingerprint, ts" +
			" ORDER BY fingerprint, ts"

	selectLabelsAny := helpers.SelectLabelsAny(mq.GroupBy)
	selectLabels := helpers.SelectLabels(mq.GroupBy)

	op := helpers.AggregationColumnForSamplesTable(start, end, mq)

	switch mq.TimeAggregation {
	case v3.TimeAggregationAvg:
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationSum:
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationMin:
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationMax:
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationCount:
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationCountDistinct:
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationAnyLast:
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TimeAggregationRate:
		innerSubQuery := fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
		rateExp := rateWithoutNegative
		if _, ok := os.LookupEnv("EXPERIMENTAL_RATE_WITHOUT_NEGATIVE"); ok {
			rateExp = fmt.Sprintf(experimentalRateWithoutNegative, start)
		}
		rateQueryTmpl :=
			"SELECT %s ts, " + rateExp +
				" as per_series_value FROM (%s) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)"
		subQuery = fmt.Sprintf(rateQueryTmpl, selectLabels, innerSubQuery)
	case v3.TimeAggregationIncrease:
		innerSubQuery := fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
		increaseExp := increaseWithoutNegative
		if _, ok := os.LookupEnv("EXPERIMENTAL_INCREASE_WITHOUT_NEGATIVE"); ok {
			increaseExp = fmt.Sprintf(experimentalIncreaseWithoutNegative, start, start)
		}
		rateQueryTmpl :=
			"SELECT %s ts, " + increaseExp +
				" as per_series_value FROM (%s) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)"
		subQuery = fmt.Sprintf(rateQueryTmpl, selectLabels, innerSubQuery)
	}
	return subQuery, nil
}

// PrepareMetricQueryCumulativeTimeSeries prepares the query to be used for fetching metrics
func PrepareMetricQueryCumulativeTimeSeries(start, end, step int64, mq *v3.BuilderQuery) (string, error) {
	var query string

	temporalAggSubQuery, err := prepareTimeAggregationSubQuery(start, end, step, mq)
	if err != nil {
		return "", err
	}

	groupBy := helpers.GroupingSetsByAttributeKeyTags(mq.GroupBy...)
	orderBy := helpers.OrderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)
	selectLabels := helpers.GroupByAttributeKeyTags(mq.GroupBy...)

	valueFilter := " WHERE isNaN(per_series_value) = 0"
	if mq.MetricValueFilter != nil {
		valueFilter += fmt.Sprintf(" AND per_series_value = %f", mq.MetricValueFilter.Value)
	}

	queryTmpl :=
		"SELECT %s," +
			" %s as value" +
			" FROM (%s)" +
			valueFilter +
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
