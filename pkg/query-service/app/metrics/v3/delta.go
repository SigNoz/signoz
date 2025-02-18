package v3

import (
	"fmt"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func buildDeltaMetricQuery(start, end, step int64, mq *v3.BuilderQuery) (string, error) {

	metricQueryGroupBy := mq.GroupBy

	if mq.Filters != nil {
		temporalityFound := false
		for _, filter := range mq.Filters.Items {
			if filter.Key.Key == "__temporality__" {
				temporalityFound = true
				break
			}
		}

		if !temporalityFound {
			mq.Filters.Items = append(mq.Filters.Items, v3.FilterItem{
				Key:      v3.AttributeKey{Key: "__temporality__"},
				Operator: v3.FilterOperatorEqual,
				Value:    "Delta",
			})
		}
	}

	filterSubQuery, err := helpers.PrepareTimeseriesFilterQueryV3(start, end, mq)
	if err != nil {
		return "", err
	}

	samplesTableTimeFilter := fmt.Sprintf("metric_name IN %s AND unix_milli >= %d AND unix_milli <= %d", utils.ClickHouseFormattedMetricNames(mq.AggregateAttribute.Key), start, end)

	// Select the aggregate value for interval
	queryTmpl :=
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

	// tagsWithoutLe is used to group by all tags except le
	// This is done because we want to group by le only when we are calculating quantile
	// Otherwise, we want to group by all tags except le
	tagsWithoutLe := []string{}
	for _, tag := range mq.GroupBy {
		if tag.Key != "le" {
			tagsWithoutLe = append(tagsWithoutLe, tag.Key)
		}
	}

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
		// Calculate rate of change of metric for each unique time series
		groupBy = "fingerprint, ts"
		orderBy = "fingerprint, "
		groupTags = "fingerprint,"
		op := fmt.Sprintf("sum(value)/%d", step)
		query := fmt.Sprintf(
			queryTmpl, "any(labels) as fullLabels, "+groupTags, step, op, filterSubQuery, groupBy, orderBy,
		) // labels will be same so any should be fine

		return query, nil
	case v3.AggregateOperatorSumRate, v3.AggregateOperatorAvgRate, v3.AggregateOperatorMaxRate, v3.AggregateOperatorMinRate:
		op := fmt.Sprintf("%s(value)/%d", aggregateOperatorToSQLFunc[mq.AggregateOperator], step)
		query := fmt.Sprintf(
			queryTmpl, groupTags, step, op, filterSubQuery, groupBy, orderBy,
		)
		return query, nil
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin:
		op := fmt.Sprintf("%s(value)/%d", aggregateOperatorToSQLFunc[mq.AggregateOperator], step)
		query := fmt.Sprintf(
			queryTmpl, groupTags, step, op, filterSubQuery, groupBy, orderBy,
		)
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
		query := fmt.Sprintf(queryTmpl, groupTags, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorHistQuant50, v3.AggregateOperatorHistQuant75, v3.AggregateOperatorHistQuant90, v3.AggregateOperatorHistQuant95, v3.AggregateOperatorHistQuant99:
		op := fmt.Sprintf("sum(value)/%d", step)
		query := fmt.Sprintf(
			queryTmpl, groupTags, step, op, filterSubQuery, groupBy, orderBy,
		) // labels will be same so any should be fine
		value := aggregateOperatorToPercentile[mq.AggregateOperator]

		query = fmt.Sprintf(`SELECT %s ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), %.3f) as value FROM (%s) GROUP BY %s ORDER BY %s ts`, groupTagsWithoutLe, value, query, groupByWithoutLe, orderWithoutLe)
		return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(value)", aggregateOperatorToSQLFunc[mq.AggregateOperator])
		query := fmt.Sprintf(queryTmpl, groupTags, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorCount:
		op := "toFloat64(count(*))"
		query := fmt.Sprintf(queryTmpl, groupTags, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := "toFloat64(count(distinct(value)))"
		query := fmt.Sprintf(queryTmpl, groupTags, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorNoOp:
		queryTmpl :=
			"SELECT fingerprint, labels as fullLabels," +
				" toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL %d SECOND) as ts," +
				" any(value) as value" +
				" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_V4_TABLENAME +
				" INNER JOIN" +
				" (%s) as filtered_time_series" +
				" USING fingerprint" +
				" WHERE " + samplesTableTimeFilter +
				" GROUP BY fingerprint, labels, ts" +
				" ORDER BY fingerprint, labels, ts"
		query := fmt.Sprintf(queryTmpl, step, filterSubQuery)
		return query, nil
	default:
		return "", fmt.Errorf("unsupported aggregate operator")
	}
}
