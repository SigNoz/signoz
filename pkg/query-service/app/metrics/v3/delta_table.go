package v3

import (
	"fmt"
	"math"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func buildDeltaMetricQueryForTable(start, end, _ int64, mq *v3.BuilderQuery) (string, error) {

	// round up to the nearest multiple of 60
	step := int64(math.Ceil(float64(end-start+1)/1000/60) * 60)

	metricQueryGroupBy := mq.GroupBy

	// if the aggregate operator is a histogram quantile, and user has not forgotten
	// the le tag in the group by then add the le tag to the group by
	if mq.AggregateOperator == v3.AggregateOperatorHistQuant50 ||
		mq.AggregateOperator == v3.AggregateOperatorHistQuant75 ||
		mq.AggregateOperator == v3.AggregateOperatorHistQuant90 ||
		mq.AggregateOperator == v3.AggregateOperatorHistQuant95 ||
		mq.AggregateOperator == v3.AggregateOperatorHistQuant99 {
		found := false
		for _, tag := range mq.GroupBy {
			if tag.Key == "le" {
				found = true
				break
			}
		}
		if !found {
			metricQueryGroupBy = append(
				metricQueryGroupBy,
				v3.AttributeKey{
					Key:      "le",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeTag,
					IsColumn: false,
				},
			)
		}
	}

	filterSubQuery, err := helpers.PrepareTimeseriesFilterQueryV3(start, end, mq)
	if err != nil {
		return "", err
	}

	samplesTableTimeFilter := fmt.Sprintf("metric_name IN %s AND unix_milli >= %d AND unix_milli <= %d", utils.ClickHouseFormattedMetricNames(mq.AggregateAttribute.Key), start, end)

	queryTmpl :=
		"SELECT %s toStartOfHour(now()) as ts," + // now() has no menaing & used as a placeholder for ts
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

	groupByWithoutLeTable := groupBy(tagsWithoutLe...)
	groupTagsWithoutLeTable := groupSelect(tagsWithoutLe...)
	orderWithoutLeTable := orderBy(mq.OrderBy, tagsWithoutLe)

	groupBy := groupByAttributeKeyTags(metricQueryGroupBy...)
	groupTags := groupSelectAttributeKeyTags(metricQueryGroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, metricQueryGroupBy)

	if len(orderBy) != 0 {
		orderBy += ","
	}
	if len(orderWithoutLeTable) != 0 {
		orderWithoutLeTable += ","
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRate:
		// TODO(srikanthccv): what should be the expected behavior here for metrics?
		return "", fmt.Errorf("rate is not supported for table view")
	case v3.AggregateOperatorSumRate, v3.AggregateOperatorAvgRate, v3.AggregateOperatorMaxRate, v3.AggregateOperatorMinRate:
		op := fmt.Sprintf("%s(value)/%d", aggregateOperatorToSQLFunc[mq.AggregateOperator], step)
		query := fmt.Sprintf(
			queryTmpl, groupTags, op, filterSubQuery, groupBy, orderBy,
		)
		return query, nil
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin:
		op := fmt.Sprintf("%s(value)/%d", aggregateOperatorToSQLFunc[mq.AggregateOperator], step)
		query := fmt.Sprintf(
			queryTmpl, groupTags, op, filterSubQuery, groupBy, orderBy,
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
		query := fmt.Sprintf(queryTmpl, groupTags, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorHistQuant50, v3.AggregateOperatorHistQuant75, v3.AggregateOperatorHistQuant90, v3.AggregateOperatorHistQuant95, v3.AggregateOperatorHistQuant99:
		op := fmt.Sprintf("sum(value)/%d", step)
		query := fmt.Sprintf(
			queryTmpl, groupTags, op, filterSubQuery, groupBy, orderBy,
		) // labels will be same so any should be fine
		value := aggregateOperatorToPercentile[mq.AggregateOperator]

		query = fmt.Sprintf(`SELECT %s ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), %.3f) as value FROM (%s) GROUP BY %s ORDER BY %s ts`, groupTagsWithoutLeTable, value, query, groupByWithoutLeTable, orderWithoutLeTable)
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
