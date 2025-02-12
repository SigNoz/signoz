package helpers

import (
	"fmt"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func AddSecondaryAggregation(seriesAggregator v3.SecondaryAggregation, query string) string {
	queryImpl := "SELECT %s as aggregated_value, ts" +
		" FROM (%s)" +
		" GROUP BY ts" +
		" ORDER BY ts"

	var op string
	switch seriesAggregator {
	case v3.SecondaryAggregationAvg:
		op = "avg(value)"
		query = fmt.Sprintf(queryImpl, op, query)
	case v3.SecondaryAggregationSum:
		op = "sum(value)"
		query = fmt.Sprintf(queryImpl, op, query)
	case v3.SecondaryAggregationMin:
		op = "min(value)"
		query = fmt.Sprintf(queryImpl, op, query)
	case v3.SecondaryAggregationMax:
		op = "max(value)"
		query = fmt.Sprintf(queryImpl, op, query)
	}
	return query
}
