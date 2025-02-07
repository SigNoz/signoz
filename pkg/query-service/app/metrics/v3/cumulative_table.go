package v3

import (
	"fmt"
	"math"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

// This logic is little convoluted for a reason.
// When we work with cumulative metrics, the table view need to show the data for the entire time range.
// In some cases, we could take the points at the start and end of the time range and divide it by the
// duration. But, the problem is there is no guarantee that the trend will be linear between the start and end.
// We can sum the rate of change for some interval X, this interval can be step size of time series.
// However, the speed of query depends on the number of timestamps, so we bump up the xx the step size.
// This should be a good balance between speed and accuracy.
// TODO: find a better way to do this
func stepForTableCumulative(start, end int64) int64 {
	// round up to the nearest multiple of 60
	duration := (end - start + 1) / 1000
	step := math.Max(math.Floor(float64(duration)/120), 60) // assuming 120 max points
	if duration > 1800 {                                    // bump for longer duration
		step = step * 5
	}
	return int64(step)
}

func buildMetricQueryForTable(start, end, _ int64, mq *v3.BuilderQuery) (string, error) {

	step := stepForTableCumulative(start, end)

	points := ((end - start + 1) / 1000) / step

	metricQueryGroupBy := mq.GroupBy

	filterSubQuery, err := helpers.PrepareTimeseriesFilterQueryV3(start, end, mq)
	if err != nil {
		return "", err
	}

	samplesTableTimeFilter := fmt.Sprintf("metric_name IN %s AND unix_milli >= %d AND unix_milli <= %d", utils.ClickHouseFormattedMetricNames(mq.AggregateAttribute.Key), start, end)

	// Select the aggregate value for interval
	queryTmplCounterInner :=
		"SELECT %s" +
			" toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL %d SECOND) as ts," +
			" %s as value" +
			" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_V4_TABLENAME +
			" INNER JOIN" +
			" (%s) as filtered_time_series" +
			" USING fingerprint" +
			" WHERE " + samplesTableTimeFilter +
			" GROUP BY %s" +
			" ORDER BY %s ts"

	// Select the aggregate value for interval
	queryTmpl :=
		"SELECT %s" +
			" toStartOfHour(now()) as ts," + // now() has no menaing & used as a placeholder for ts
			" %s as value" +
			" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_V4_TABLENAME +
			" INNER JOIN" +
			" (%s) as filtered_time_series" +
			" USING fingerprint" +
			" WHERE " + samplesTableTimeFilter +
			" GROUP BY %s" +
			" ORDER BY %s ts"

	// tagsWithoutLe is used to group by all tags except le
	// This is done because we want to group by le only when we are calculating quantile
	// Otherwise, we want to group by all tags except le
	tagsWithoutLe := []string{}
	for _, tag := range mq.GroupBy {
		if tag.Key != "le" {
			tagsWithoutLe = append(tagsWithoutLe, tag.Key)
		}
	}

	// orderWithoutLe := orderBy(mq.OrderBy, tagsWithoutLe)

	groupByWithoutLe := groupBy(tagsWithoutLe...)
	groupTagsWithoutLe := groupSelect(tagsWithoutLe...)
	orderWithoutLe := orderBy(mq.OrderBy, tagsWithoutLe)

	groupBy := groupByAttributeKeyTags(metricQueryGroupBy...)
	groupTags := groupSelectAttributeKeyTags(metricQueryGroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, metricQueryGroupBy)

	if len(orderBy) != 0 {
		orderBy += ","
	}
	if len(orderWithoutLe) != 0 {
		orderWithoutLe += ","
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRate:
		return "", fmt.Errorf("rate is not supported for table view")
	case v3.AggregateOperatorSumRate, v3.AggregateOperatorAvgRate, v3.AggregateOperatorMaxRate, v3.AggregateOperatorMinRate:
		rateGroupBy := "fingerprint, " + groupBy
		rateGroupTags := "fingerprint, " + groupTags
		rateOrderBy := "fingerprint, " + orderBy
		partitionBy := "fingerprint"
		if len(groupTags) != 0 {
			partitionBy += ", " + groupTags
			partitionBy = strings.Trim(partitionBy, ", ")
		}
		op := "max(value)"
		subQuery := fmt.Sprintf(
			queryTmplCounterInner, rateGroupTags, step, op, filterSubQuery, rateGroupBy, rateOrderBy,
		) // labels will be same so any should be fine
		query := `SELECT %s ts, ` + rateWithoutNegative + `as rate_value FROM(%s) WINDOW rate_window as (PARTITION BY %s ORDER BY %s ts)`
		query = fmt.Sprintf(query, groupTags, subQuery, partitionBy, rateOrderBy)
		query = fmt.Sprintf(`SELECT %s toStartOfHour(now()) as ts, %s(rate_value)/%d as value FROM (%s) WHERE isNaN(rate_value) = 0 GROUP BY %s ORDER BY %s ts`, groupTags, aggregateOperatorToSQLFunc[mq.AggregateOperator], points, query, groupBy, orderBy)
		return query, nil
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin:
		step = ((end - start + 1) / 1000) / 2
		op := fmt.Sprintf("%s(value)", aggregateOperatorToSQLFunc[mq.AggregateOperator])
		subQuery := fmt.Sprintf(queryTmplCounterInner, groupTags, step, op, filterSubQuery, groupBy, orderBy)
		partitionBy := ""
		if len(groupTags) != 0 {
			partitionBy = "PARTITION BY " + groupTags
			partitionBy = strings.Trim(partitionBy, ", ")
		}
		query := `SELECT %s toStartOfHour(now()) as ts, ` + rateWithoutNegative + `as value FROM(%s) WINDOW rate_window as (%s ORDER BY %s ts)`
		query = fmt.Sprintf(query, groupTags, subQuery, partitionBy, groupTags)
		return query, nil
	case
		v3.AggregateOperatorP05,
		v3.AggregateOperatorP10,
		v3.AggregateOperatorP20,
		v3.AggregateOperatorP25,
		v3.AggregateOperatorP50,
		v3.AggregateOperatorP75,
		v3.AggregateOperatorP90,
		v3.AggregateOperatorP95,
		v3.AggregateOperatorP99:
		op := fmt.Sprintf("quantile(%v)(value)", aggregateOperatorToPercentile[mq.AggregateOperator])
		query := fmt.Sprintf(queryTmpl, groupTags, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorHistQuant50, v3.AggregateOperatorHistQuant75, v3.AggregateOperatorHistQuant90, v3.AggregateOperatorHistQuant95, v3.AggregateOperatorHistQuant99:
		rateGroupBy := "fingerprint, " + groupBy
		rateGroupTags := "fingerprint, " + groupTags
		rateOrderBy := "fingerprint, " + orderBy
		partitionBy := "fingerprint"
		if len(groupTags) != 0 {
			partitionBy += ", " + groupTags
			partitionBy = strings.Trim(partitionBy, ", ")
		}
		op := "max(value)"
		subQuery := fmt.Sprintf(
			queryTmplCounterInner, rateGroupTags, step, op, filterSubQuery, rateGroupBy, rateOrderBy,
		) // labels will be same so any should be fine
		query := `SELECT %s ts, ` + rateWithoutNegative + ` as rate_value FROM(%s) WINDOW rate_window as (PARTITION BY %s ORDER BY %s ts)`
		query = fmt.Sprintf(query, groupTags, subQuery, partitionBy, rateOrderBy)
		query = fmt.Sprintf(`SELECT %s toStartOfHour(now()) as ts, sum(rate_value)/%d as value FROM (%s) WHERE isNaN(rate_value) = 0 GROUP BY %s ORDER BY %s ts`, groupTags, points, query, groupBy, orderBy)
		value := aggregateOperatorToPercentile[mq.AggregateOperator]

		query = fmt.Sprintf(`SELECT %s toStartOfHour(now()) as ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), %.3f) as value FROM (%s) GROUP BY %s ORDER BY %s ts`, groupTagsWithoutLe, value, query, groupByWithoutLe, orderWithoutLe)
		return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(value)", aggregateOperatorToSQLFunc[mq.AggregateOperator])
		query := fmt.Sprintf(queryTmpl, groupTags, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorCount:
		op := "toFloat64(count(*))"
		query := fmt.Sprintf(queryTmpl, groupTags, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := "toFloat64(count(distinct(value)))"
		query := fmt.Sprintf(queryTmpl, groupTags, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorNoOp:
		return "", fmt.Errorf("noop is not supported for table view")
	default:
		return "", fmt.Errorf("unsupported aggregate operator")
	}
}
