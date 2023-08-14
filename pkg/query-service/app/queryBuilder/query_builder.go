package queryBuilder

import (
	"fmt"
	"strings"

	"github.com/SigNoz/govaluate"
	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/constants"
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

type prepareTracesQueryFunc func(start, end int64, panelType v3.PanelType, bq *v3.BuilderQuery, keys map[string]v3.AttributeKey, graphLimitQtype string) (string, error)
type prepareLogsQueryFunc func(start, end int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery, options logsV3.Options) (string, error)
type prepareMetricQueryFunc func(start, end int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery) (string, error)

type QueryBuilder struct {
	options QueryBuilderOptions
}

type QueryBuilderOptions struct {
	BuildTraceQuery  prepareTracesQueryFunc
	BuildLogQuery    prepareLogsQueryFunc
	BuildMetricQuery prepareMetricQueryFunc
}

func NewQueryBuilder(options QueryBuilderOptions) *QueryBuilder {
	return &QueryBuilder{
		options: options,
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
func expressionToQuery(qp *v3.QueryRangeParamsV3, varToQuery map[string]string, expression *govaluate.EvaluableExpression) (string, error) {
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
		groupTags = append(groupTags, "ts")
		if joinUsing == "" {
			for _, tag := range groupTags {
				joinUsing += fmt.Sprintf("%s.%s as %s, ", variable, tag, tag)
			}
			joinUsing = strings.TrimSuffix(joinUsing, ", ")
		}
		formulaSubQuery += fmt.Sprintf("(%s) as %s ", query, variable)
		if idx > 0 {
			formulaSubQuery += " ON "
			for _, tag := range groupTags {
				formulaSubQuery += fmt.Sprintf("%s.%s = %s.%s AND ", prevVar, tag, variable, tag)
			}
			formulaSubQuery = strings.TrimSuffix(formulaSubQuery, " AND ")
		}
		if idx < len(variables)-1 {
			formulaSubQuery += " INNER JOIN "
		}
		prevVar = variable
	}
	formulaQuery = fmt.Sprintf("SELECT %s, %s as value FROM ", joinUsing, formula.ExpressionString()) + formulaSubQuery
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
				queryStr, err = qb.options.BuildLogQuery(params.Start, params.End, compositeQuery.QueryType, compositeQuery.PanelType, query, logsV3.Options{IsLivetailQuery: true})
				if err != nil {
					return "", err
				}
			}
		}

	}
	return queryStr, nil
}

func (qb *QueryBuilder) PrepareQueries(params *v3.QueryRangeParamsV3, args ...interface{}) (map[string]string, error) {
	queries := make(map[string]string)

	compositeQuery := params.CompositeQuery

	if compositeQuery != nil {

		// Build queries for each builder query
		for queryName, query := range compositeQuery.BuilderQueries {
			if query.Expression == queryName {
				switch query.DataSource {
				case v3.DataSourceTraces:
					keys := map[string]v3.AttributeKey{}
					if len(args) > 0 {
						keys = args[0].(map[string]v3.AttributeKey)
					}
					// for ts query with group by and limit form two queries
					if compositeQuery.PanelType == v3.PanelTypeGraph && query.Limit > 0 && len(query.GroupBy) > 0 {
						limitQuery, err := qb.options.BuildTraceQuery(params.Start, params.End, compositeQuery.PanelType, query, keys, constants.FirstQueryGraphLimit)
						if err != nil {
							return nil, err
						}
						placeholderQuery, err := qb.options.BuildTraceQuery(params.Start, params.End, compositeQuery.PanelType, query, keys, constants.SecondQueryGraphLimit)
						if err != nil {
							return nil, err
						}
						query := fmt.Sprintf(placeholderQuery, limitQuery)
						queries[queryName] = query
					} else {
						queryString, err := qb.options.BuildTraceQuery(params.Start, params.End, compositeQuery.PanelType, query, keys, "")
						if err != nil {
							return nil, err
						}
						queries[queryName] = queryString
					}
				case v3.DataSourceLogs:
					// for ts query with limit replace it as it is already formed
					if compositeQuery.PanelType == v3.PanelTypeGraph && query.Limit > 0 && len(query.GroupBy) > 0 {
						limitQuery, err := qb.options.BuildLogQuery(params.Start, params.End, compositeQuery.QueryType, compositeQuery.PanelType, query, logsV3.Options{GraphLimitQtype: constants.FirstQueryGraphLimit})
						if err != nil {
							return nil, err
						}
						placeholderQuery, err := qb.options.BuildLogQuery(params.Start, params.End, compositeQuery.QueryType, compositeQuery.PanelType, query, logsV3.Options{GraphLimitQtype: constants.SecondQueryGraphLimit})
						if err != nil {
							return nil, err
						}
						query := fmt.Sprintf(placeholderQuery, limitQuery)
						queries[queryName] = query
					} else {
						queryString, err := qb.options.BuildLogQuery(params.Start, params.End, compositeQuery.QueryType, compositeQuery.PanelType, query, logsV3.Options{})
						if err != nil {
							return nil, err
						}
						queries[queryName] = queryString
					}
				case v3.DataSourceMetrics:
					queryString, err := qb.options.BuildMetricQuery(params.Start, params.End, compositeQuery.QueryType, compositeQuery.PanelType, query)
					if err != nil {
						return nil, err
					}
					queries[queryName] = queryString
				default:
					zap.S().Errorf("Unknown data source %s", query.DataSource)
				}
			}
		}

		// Build queries for each expression
		for _, query := range compositeQuery.BuilderQueries {
			if query.Expression != query.QueryName {
				expression, _ := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, EvalFuncs)

				queryString, err := expressionToQuery(params, queries, expression)
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

func (c *cacheKeyGenerator) GenerateKeys(params *v3.QueryRangeParamsV3) map[string]string {
	keys := make(map[string]string)

	// Build keys for each builder query
	for queryName, query := range params.CompositeQuery.BuilderQueries {
		if query.Expression == queryName {
			var parts []string

			// We need to build uniqe cache query for BuilderQuery

			parts = append(parts, fmt.Sprintf("source=%s", query.DataSource))
			parts = append(parts, fmt.Sprintf("step=%d", query.StepInterval))
			parts = append(parts, fmt.Sprintf("aggregate=%s", query.AggregateOperator))

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
			expression, _ := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, EvalFuncs)

			expressionCacheKey := expressionToKey(expression, keys)
			keys[query.QueryName] = expressionCacheKey
		}
	}

	return keys
}

func NewKeyGenerator() cache.KeyGenerator {
	return &cacheKeyGenerator{}
}
