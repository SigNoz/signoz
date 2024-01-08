package cumulative

import (
	"fmt"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// prepareMetricQueryTable prepares the query to be used for fetching metrics
func prepareMetricQueryTable(start, end, step int64, mq *v3.BuilderQuery) (string, error) {
	var query string

	temporalAggSubQuery, err := prepareTimeAggregationSubQuery(start, end, step, mq)
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
