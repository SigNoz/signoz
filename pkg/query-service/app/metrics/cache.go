package metrics

import (
	"fmt"
	"sort"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/model"
)

type metricsKeyGenerator struct {
}

func NewMetricsKeyGenerator() *metricsKeyGenerator {
	return &metricsKeyGenerator{}
}

func (m *metricsKeyGenerator) GenerateKeys(params *model.QueryRangeParamsV2) map[string]string {
	var cacheKeys map[string]string

	if params.CompositeMetricQuery != nil {
		step := params.Step
		switch params.CompositeMetricQuery.QueryType {
		case model.QUERY_BUILDER:
			for queryName, builderQuery := range params.CompositeMetricQuery.BuilderQueries {
				metricName := builderQuery.MetricName
				operator := builderQuery.AggregateOperator
				filterString := ""
				if builderQuery.TagFilters != nil {
					for _, item := range builderQuery.TagFilters.Items {
						filterString += fmt.Sprintf("%s+%s+%v", item.Key, item.Operator, item.Value)
					}
				}
				sort.Strings(builderQuery.GroupingTags)
				groupBy := strings.Join(builderQuery.GroupingTags, "+")
				cacheKey := fmt.Sprintf("step:%d-metricName:%s-operator:%d-filters:%s-groupBy:%s", step, metricName, operator, filterString, groupBy)
				cacheKeys[queryName] = cacheKey
			}
		case model.PROM:
			for queryName, promQuery := range params.CompositeMetricQuery.PromQueries {
				cacheKey := fmt.Sprintf("step:%d-promQuery:%s", step, promQuery.Query)
				cacheKeys[queryName] = cacheKey
			}
		case model.CLICKHOUSE:
			// TODO
		}
	}
	return cacheKeys
}
