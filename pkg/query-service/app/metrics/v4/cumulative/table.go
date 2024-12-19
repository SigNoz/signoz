package cumulative

import (
	"fmt"

	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// PrepareMetricQueryCumulativeTable prepares the query to be used for fetching metrics
func PrepareMetricQueryCumulativeTable(start, end, step int64, mq *v3.BuilderQuery) (string, error) {
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
