package queryBuilder

import (
	"fmt"
	"strings"

	"github.com/SigNoz/govaluate"
	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

var SupportedFunctions = []string{
	"exp",
	"log",
	"ln",
	"exp2",
	"log2",
	"exp10",
	"log10",
	"sqrt",
	"cbrt",
	"erf",
	"erfc",
	"lgamma",
	"tgamma",
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan",
	"degrees",
	"radians",
	"now",
	"toUnixTimestamp",
}

var EvalFuncs = map[string]govaluate.ExpressionFunction{}

type prepareTracesQueryFunc func(start, end int64, panelType v3.PanelType, bq *v3.BuilderQuery, options v3.QBOptions) (string, error)
type prepareLogsQueryFunc func(start, end int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery, options v3.QBOptions) (string, error)
type prepareMetricQueryFunc func(start, end int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery, options metricsV3.Options) (string, error)

type QueryBuilder struct {
	options      QueryBuilderOptions
	featureFlags interfaces.FeatureLookup
}

type QueryBuilderOptions struct {
	BuildTraceQuery  prepareTracesQueryFunc
	BuildLogQuery    prepareLogsQueryFunc
	BuildMetricQuery prepareMetricQueryFunc
}

func NewQueryBuilder(options QueryBuilderOptions, featureFlags interfaces.FeatureLookup) *QueryBuilder {
	return &QueryBuilder{
		options:      options,
		featureFlags: featureFlags,
	}
}

func init() {
	for _, fn := range SupportedFunctions {
		EvalFuncs[fn] = func(args ...interface{}) (interface{}, error) {
			return nil, nil
		}
	}
}

// unique returns the unique values in the slice
func unique(slice []string) []string {
	keys := make(map[string]struct{})
	list := []string{}
	for _, entry := range slice {
		if _, value := keys[entry]; !value {
			keys[entry] = struct{}{}
			list = append(list, entry)
		}
	}
	return list
}

// expressionToQuery constructs the query for the expression
func expressionToQuery(
	qp *v3.QueryRangeParamsV3,
	varToQuery map[string]string,
	expression *govaluate.EvaluableExpression,
	queryName string,
) (string, error) {
	var formulaQuery string
	variables := unique(expression.Vars())

	var modified []govaluate.ExpressionToken
	tokens := expression.Tokens()
	for idx := range tokens {
		token := tokens[idx]
		if token.Kind == govaluate.VARIABLE {
			token.Value = fmt.Sprintf("%v.value", token.Value)
			token.Meta = fmt.Sprintf("%v.value", token.Meta)
		}
		modified = append(modified, token)
	}
	// err should be nil here since the expression is already validated
	formula, _ := govaluate.NewEvaluableExpressionFromTokens(modified)

	var formulaSubQuery string
	var joinUsing string
	var prevVar string
	for idx, variable := range variables {
		query := varToQuery[variable]
		groupTags := []string{}
		for _, tag := range qp.CompositeQuery.BuilderQueries[variable].GroupBy {
			groupTags = append(groupTags, tag.Key)
		}
		if qp.CompositeQuery.PanelType != v3.PanelTypeTable {
			groupTags = append(groupTags, "ts")
		}
		if joinUsing == "" {
			for _, tag := range groupTags {
				joinUsing += fmt.Sprintf("%s.`%s` as `%s`, ", variable, tag, tag)
			}
			joinUsing = strings.TrimSuffix(joinUsing, ", ")
		}
		formulaSubQuery += fmt.Sprintf("(%s) as %s ", query, variable)
		if idx > 0 {
			formulaSubQuery += " ON "
			for _, tag := range groupTags {
				formulaSubQuery += fmt.Sprintf("%s.`%s` = %s.`%s` AND ", prevVar, tag, variable, tag)
			}
			formulaSubQuery = strings.TrimSuffix(formulaSubQuery, " AND ")
		}
		if idx < len(variables)-1 {
			formulaSubQuery += " INNER JOIN "
		}
		prevVar = variable
	}
	formulaQuery = fmt.Sprintf("SELECT %s, %s as value FROM ", joinUsing, formula.ExpressionString()) + formulaSubQuery
	if len(qp.CompositeQuery.BuilderQueries[queryName].Having) > 0 {
		conditions := []string{}
		for _, having := range qp.CompositeQuery.BuilderQueries[queryName].Having {
			conditions = append(conditions, fmt.Sprintf("%s %s %v", "value", having.Operator, having.Value))
		}
		havingClause := " HAVING " + strings.Join(conditions, " AND ")
		formulaQuery += havingClause
	}
	return formulaQuery, nil
}

func (qb *QueryBuilder) PrepareLiveTailQuery(params *v3.QueryRangeParamsV3) (string, error) {
	var queryStr string
	var err error
	compositeQuery := params.CompositeQuery

	if compositeQuery != nil {
		// There can only be a signle query and there is no concept of disabling queries
		if len(compositeQuery.BuilderQueries) != 1 {
			return "", fmt.Errorf("live tail is only supported for single query")
		}
		for queryName, query := range compositeQuery.BuilderQueries {
			if query.Expression == queryName {
				queryStr, err = qb.options.BuildLogQuery(params.Start, params.End, compositeQuery.QueryType, compositeQuery.PanelType, query, v3.QBOptions{IsLivetailQuery: true})
				if err != nil {
					return "", err
				}
			}
		}

	}
	return queryStr, nil
}

func (qb *QueryBuilder) PrepareQueries(params *v3.QueryRangeParamsV3) (map[string]string, error) {
	queries := make(map[string]string)

	compositeQuery := params.CompositeQuery

	if compositeQuery != nil {
		err := qb.featureFlags.CheckFeature(constants.PreferRPM)
		PreferRPMFeatureEnabled := err == nil
		// Build queries for each builder query
		for queryName, query := range compositeQuery.BuilderQueries {
			// making a local clone since we should not update the global params if there is sift by
			start := params.Start
			end := params.End
			if query.ShiftBy != 0 {
				start = start - query.ShiftBy*1000
				end = end - query.ShiftBy*1000
			}
			if query.Expression == queryName {
				switch query.DataSource {
				case v3.DataSourceTraces:
					// for ts query with group by and limit form two queries
					if compositeQuery.PanelType == v3.PanelTypeGraph && query.Limit > 0 && len(query.GroupBy) > 0 {
						limitQuery, err := qb.options.BuildTraceQuery(start, end, compositeQuery.PanelType, query,
							v3.QBOptions{GraphLimitQtype: constants.FirstQueryGraphLimit, PreferRPM: PreferRPMFeatureEnabled})
						if err != nil {
							return nil, err
						}
						placeholderQuery, err := qb.options.BuildTraceQuery(start, end, compositeQuery.PanelType,
							query, v3.QBOptions{GraphLimitQtype: constants.SecondQueryGraphLimit, PreferRPM: PreferRPMFeatureEnabled})
						if err != nil {
							return nil, err
						}
						query := fmt.Sprintf(placeholderQuery, limitQuery)
						queries[queryName] = query
					} else {
						queryString, err := qb.options.BuildTraceQuery(start, end, compositeQuery.PanelType,
							query, v3.QBOptions{PreferRPM: PreferRPMFeatureEnabled, GraphLimitQtype: ""})
						if err != nil {
							return nil, err
						}
						queries[queryName] = queryString
					}
				case v3.DataSourceLogs:
					// for ts query with limit replace it as it is already formed
					if compositeQuery.PanelType == v3.PanelTypeGraph && query.Limit > 0 && len(query.GroupBy) > 0 {
						limitQuery, err := qb.options.BuildLogQuery(start, end, compositeQuery.QueryType, compositeQuery.PanelType, query, v3.QBOptions{GraphLimitQtype: constants.FirstQueryGraphLimit, PreferRPM: PreferRPMFeatureEnabled})
						if err != nil {
							return nil, err
						}
						placeholderQuery, err := qb.options.BuildLogQuery(start, end, compositeQuery.QueryType, compositeQuery.PanelType, query, v3.QBOptions{GraphLimitQtype: constants.SecondQueryGraphLimit, PreferRPM: PreferRPMFeatureEnabled})
						if err != nil {
							return nil, err
						}
						query := fmt.Sprintf(placeholderQuery, limitQuery)
						queries[queryName] = query
					} else {
						queryString, err := qb.options.BuildLogQuery(start, end, compositeQuery.QueryType, compositeQuery.PanelType, query, v3.QBOptions{PreferRPM: PreferRPMFeatureEnabled, GraphLimitQtype: ""})
						if err != nil {
							return nil, err
						}
						queries[queryName] = queryString
					}
				case v3.DataSourceMetrics:
					queryString, err := qb.options.BuildMetricQuery(start, end, compositeQuery.QueryType, compositeQuery.PanelType, query, metricsV3.Options{PreferRPM: PreferRPMFeatureEnabled})
					if err != nil {
						return nil, err
					}
					queries[queryName] = queryString
				default:
					zap.L().Error("Unknown data source", zap.String("dataSource", string(query.DataSource)))
				}
			}
		}

		// Build queries for each expression
		for _, query := range compositeQuery.BuilderQueries {
			if query.Expression != query.QueryName {
				expression, err := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, EvalFuncs)

				if err != nil {
					return nil, err
				}

				queryString, err := expressionToQuery(params, queries, expression, query.QueryName)
				if err != nil {
					return nil, err
				}
				queries[query.QueryName] = queryString
			}
		}
	}

	// filter out disabled queries
	for queryName := range queries {
		if compositeQuery.BuilderQueries[queryName].Disabled {
			delete(queries, queryName)
		}
	}
	return queries, nil
}

// cacheKeyGenerator implements the cache.KeyGenerator interface
type cacheKeyGenerator struct {
}

func expressionToKey(expression *govaluate.EvaluableExpression, keys map[string]string) string {

	var modified []govaluate.ExpressionToken
	tokens := expression.Tokens()
	for idx := range tokens {
		token := tokens[idx]
		if token.Kind == govaluate.VARIABLE {
			token.Value = keys[fmt.Sprintf("%s", token.Value)]
			token.Meta = keys[fmt.Sprintf("%s", token.Meta)]
		}
		modified = append(modified, token)
	}
	// err should be nil here since the expression is already validated
	formula, _ := govaluate.NewEvaluableExpressionFromTokens(modified)
	return formula.ExpressionString()
}

func isMetricExpression(expression *govaluate.EvaluableExpression, params *v3.QueryRangeParamsV3) bool {
	variables := unique(expression.Vars())
	for _, variable := range variables {
		if params.CompositeQuery.BuilderQueries[variable].DataSource != v3.DataSourceMetrics {
			return false
		}
	}
	return true
}

func isLogExpression(expression *govaluate.EvaluableExpression, params *v3.QueryRangeParamsV3) bool {
	variables := unique(expression.Vars())
	for _, variable := range variables {
		if params.CompositeQuery.BuilderQueries[variable].DataSource != v3.DataSourceLogs {
			return false
		}
	}
	return true
}

func (c *cacheKeyGenerator) GenerateKeys(params *v3.QueryRangeParamsV3) map[string]string {
	keys := make(map[string]string)

	// Use query as the cache key for PromQL queries
	if params.CompositeQuery.QueryType == v3.QueryTypePromQL {
		if params.CompositeQuery.PanelType != v3.PanelTypeGraph {
			return keys
		}

		for name, query := range params.CompositeQuery.PromQueries {
			keys[name] = query.Query
		}
		return keys
	}

	// Build keys for each builder query
	for queryName, query := range params.CompositeQuery.BuilderQueries {
		if query.Expression == queryName && query.DataSource == v3.DataSourceLogs {

			if params.CompositeQuery.PanelType != v3.PanelTypeGraph {
				continue
			}

			var parts []string

			// We need to build uniqe cache query for BuilderQuery
			parts = append(parts, fmt.Sprintf("source=%s", query.DataSource))
			parts = append(parts, fmt.Sprintf("step=%d", query.StepInterval))
			parts = append(parts, fmt.Sprintf("aggregate=%s", query.AggregateOperator))
			parts = append(parts, fmt.Sprintf("limit=%d", query.Limit))

			if query.ShiftBy != 0 {
				parts = append(parts, fmt.Sprintf("shiftBy=%d", query.ShiftBy))
			}

			if query.AggregateAttribute.Key != "" {
				parts = append(parts, fmt.Sprintf("aggregateAttribute=%s", query.AggregateAttribute.CacheKey()))
			}

			if query.Filters != nil && len(query.Filters.Items) > 0 {
				for idx, filter := range query.Filters.Items {
					parts = append(parts, fmt.Sprintf("filter-%d=%s", idx, filter.CacheKey()))
				}
			}

			if len(query.GroupBy) > 0 {
				for idx, groupBy := range query.GroupBy {
					parts = append(parts, fmt.Sprintf("groupBy-%d=%s", idx, groupBy.CacheKey()))
				}
			}

			if len(query.OrderBy) > 0 {
				for idx, orderBy := range query.OrderBy {
					parts = append(parts, fmt.Sprintf("orderBy-%d=%s", idx, orderBy.CacheKey()))
				}
			}

			if len(query.Having) > 0 {
				for idx, having := range query.Having {
					parts = append(parts, fmt.Sprintf("having-%d=%s", idx, having.CacheKey()))
				}
			}

			key := strings.Join(parts, "&")
			keys[queryName] = key
		} else if query.Expression == queryName && query.DataSource == v3.DataSourceMetrics {
			var parts []string

			// what is this condition checking?
			// there are two version of the metric query builder, v3 and v4
			// the way query is built is different for each version
			// only time series panel type returns a "time series" data
			// every other panel type returns just a single value
			// this means that we can't use the previous results for caching
			// however, in v4, the result of every panel type is a time series data
			// that gets aggregated in the query service and then converted to a single value
			// so we can use the previous results for caching

			// if version is not v4 (it can be empty or v3) and panel type is not graph
			// then we can't use the previous results for caching
			if params.Version != "v4" && params.CompositeQuery.PanelType != v3.PanelTypeGraph {
				continue
			}

			// We need to build uniqe cache query for BuilderQuery

			parts = append(parts, fmt.Sprintf("source=%s", query.DataSource))
			parts = append(parts, fmt.Sprintf("step=%d", query.StepInterval))
			parts = append(parts, fmt.Sprintf("aggregate=%s", query.AggregateOperator))
			parts = append(parts, fmt.Sprintf("timeAggregation=%s", query.TimeAggregation))
			parts = append(parts, fmt.Sprintf("spaceAggregation=%s", query.SpaceAggregation))

			if query.ShiftBy != 0 {
				parts = append(parts, fmt.Sprintf("shiftBy=%d", query.ShiftBy))
			}

			if query.AggregateAttribute.Key != "" {
				parts = append(parts, fmt.Sprintf("aggregateAttribute=%s", query.AggregateAttribute.CacheKey()))
			}

			if query.Filters != nil && len(query.Filters.Items) > 0 {
				for idx, filter := range query.Filters.Items {
					parts = append(parts, fmt.Sprintf("filter-%d=%s", idx, filter.CacheKey()))
				}
			}

			if len(query.GroupBy) > 0 {
				for idx, groupBy := range query.GroupBy {
					parts = append(parts, fmt.Sprintf("groupBy-%d=%s", idx, groupBy.CacheKey()))
				}
				if params.CompositeQuery.PanelType == v3.PanelTypeValue {
					parts = append(parts, fmt.Sprintf("secondaryAggregation=%s", query.SecondaryAggregation))
				}
			}

			if len(query.Having) > 0 {
				for idx, having := range query.Having {
					parts = append(parts, fmt.Sprintf("having-%d=%s", idx, having.CacheKey()))
				}
			}

			key := strings.Join(parts, "&")
			keys[queryName] = key
		}
	}

	// Build keys for each expression
	for _, query := range params.CompositeQuery.BuilderQueries {
		if query.Expression != query.QueryName {
			if params.Version != "v4" && params.CompositeQuery.PanelType != v3.PanelTypeGraph {
				continue
			}
			expression, _ := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, EvalFuncs)

			if !isMetricExpression(expression, params) && !isLogExpression(expression, params) {
				continue
			}

			expressionCacheKey := expressionToKey(expression, keys)
			keys[query.QueryName] = expressionCacheKey
		}
	}

	return keys
}

func NewKeyGenerator() cache.KeyGenerator {
	return &cacheKeyGenerator{}
}
