package helpers

import (
	"fmt"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func AddSeriesAggregation(seriesAggregator v3.SeriesAggregation, query string) string {
	queryImpl := "SELECT %s as aggregated_value, ts" +
		" FROM (%s)" +
		" GROUP BY ts" +
		" ORDER BY ts"

	var op string
	switch seriesAggregator {
	case v3.SeriesAggregationAvg:
		op = "avg(value)"
		query = fmt.Sprintf(queryImpl, op, query)
	case v3.SeriesAggregationSum:
		op = "sum(value)"
		query = fmt.Sprintf(queryImpl, op, query)
	case v3.SeriesAggregationMin:
		op = "min(value)"
		query = fmt.Sprintf(queryImpl, op, query)
	case v3.SeriesAggregationMax:
		op = "max(value)"
		query = fmt.Sprintf(queryImpl, op, query)
	}
	return query
}
