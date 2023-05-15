package queryBuilder

import (
	"fmt"
	"strings"

	"github.com/SigNoz/govaluate"
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
}

var EvalFuncs = map[string]govaluate.ExpressionFunction{}

type prepareTracesQueryFunc func(start, end int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery, keys map[string]v3.AttributeKey) (string, error)
type prepareLogsQueryFunc func(start, end int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery, fields map[string]v3.AttributeKey) (string, error)
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
			formulaSubQuery += " GLOBAL INNER JOIN"
		}
		prevVar = variable
	}
	formulaQuery = fmt.Sprintf("SELECT %s, %s as value FROM ", joinUsing, formula.ExpressionString()) + formulaSubQuery
	return formulaQuery, nil
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
					if len(args) == 2 {
						keys = args[1].(map[string]v3.AttributeKey)
					}
					queryString, err := qb.options.BuildTraceQuery(params.Start, params.End, compositeQuery.QueryType, compositeQuery.PanelType, query, keys)
					if err != nil {
						return nil, err
					}
					queries[queryName] = queryString
				case v3.DataSourceLogs:
					fields := map[string]v3.AttributeKey{}
					if len(args) == 1 {
						fields = args[0].(map[string]v3.AttributeKey)
					}
					queryString, err := qb.options.BuildLogQuery(params.Start, params.End, compositeQuery.QueryType, compositeQuery.PanelType, query, fields)
					if err != nil {
						return nil, err
					}
					queries[queryName] = queryString
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
