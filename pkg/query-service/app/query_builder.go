package app

import (
	"fmt"
	"reflect"
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

var evalFuncs = map[string]govaluate.ExpressionFunction{}

type prepareTracesQueryFunc func(start, end, step int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery) (string, error)
type prepareLogsQueryFunc func(start, end, step int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery) (string, error)
type prepareMetricQueryFunc func(start, end, step int64, queryType v3.QueryType, panelType v3.PanelType, bq *v3.BuilderQuery) (string, error)

type queryBuilder struct {
	options queryBuilderOptions
}

type queryBuilderOptions struct {
	BuildTraceQuery  prepareTracesQueryFunc
	BuildLogQuery    prepareLogsQueryFunc
	BuildMetricQuery prepareMetricQueryFunc
}

func NewQueryBuilder(options queryBuilderOptions) *queryBuilder {
	return &queryBuilder{
		options: options,
	}
}

func init() {
	for _, fn := range SupportedFunctions {
		evalFuncs[fn] = func(args ...interface{}) (interface{}, error) {
			return nil, nil
		}
	}
}

// ClickHouseFormattedValue formats the value to be used in clickhouse query
func ClickHouseFormattedValue(v interface{}) string {
	switch x := v.(type) {
	case int:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return fmt.Sprintf("'%s'", x)
	case bool:
		return fmt.Sprintf("%v", x)
	case []interface{}:
		if len(x) == 0 {
			return ""
		}
		switch x[0].(type) {
		case string:
			str := "["
			for idx, sVal := range x {
				str += fmt.Sprintf("'%s'", sVal)
				if idx != len(x)-1 {
					str += ","
				}
			}
			str += "]"
			return str
		case int, float32, float64, bool:
			return strings.Join(strings.Fields(fmt.Sprint(x)), ",")
		default:
			zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x[0])))
			return ""
		}
	default:
		zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x)))
		return ""
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
	vars := unique(expression.Vars())
	for idx, var_ := range vars[1:] {
		x, y := vars[idx], var_
		if !reflect.DeepEqual(qp.CompositeQuery.BuilderQueries[x].GroupBy, qp.CompositeQuery.BuilderQueries[y].GroupBy) {
			return "", fmt.Errorf("group by must be same")
		}
	}
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
	for idx, var_ := range vars {
		query := varToQuery[var_]
		groupTags := qp.CompositeQuery.BuilderQueries[var_].GroupBy
		groupTags = append(groupTags, "ts")
		if joinUsing == "" {
			for _, tag := range groupTags {
				joinUsing += fmt.Sprintf("%s.%s as %s, ", var_, tag, tag)
			}
			joinUsing = strings.TrimSuffix(joinUsing, ", ")
		}
		formulaSubQuery += fmt.Sprintf("(%s) as %s ", query, var_)
		if idx > 0 {
			formulaSubQuery += " ON "
			for _, tag := range groupTags {
				formulaSubQuery += fmt.Sprintf("%s.%s = %s.%s AND ", prevVar, tag, var_, tag)
			}
			formulaSubQuery = strings.TrimSuffix(formulaSubQuery, " AND ")
		}
		if idx < len(vars)-1 {
			formulaSubQuery += " GLOBAL INNER JOIN"
		}
		prevVar = var_
	}
	formulaQuery = fmt.Sprintf("SELECT %s, %s as value FROM ", joinUsing, formula.ExpressionString()) + formulaSubQuery
	return formulaQuery, nil
}

func (qb *queryBuilder) prepareQueries(params *v3.QueryRangeParamsV3) (map[string]string, error) {
	queries := make(map[string]string)

	compositeQuery := params.CompositeQuery

	if compositeQuery != nil {

		for queryName, query := range compositeQuery.BuilderQueries {
			if query.Expression == queryName {
				switch query.DataSource {
				case v3.DataSourceTraces:
					queryString, err := qb.options.BuildTraceQuery(params.Start, params.End, params.Step, compositeQuery.QueryType, compositeQuery.PanelType, query)
					if err != nil {
						return nil, err
					}
					queries[queryName] = queryString
				case v3.DataSourceLogs:
					queryString, err := qb.options.BuildLogQuery(params.Start, params.End, params.Step, compositeQuery.QueryType, compositeQuery.PanelType, query)
					if err != nil {
						return nil, err
					}
					queries[queryName] = queryString
				case v3.DataSourceMetrics:
					queryString, err := qb.options.BuildMetricQuery(params.Start, params.End, params.Step, compositeQuery.QueryType, compositeQuery.PanelType, query)
					if err != nil {
						return nil, err
					}
					queries[queryName] = queryString
				default:
					return nil, query.DataSource.Validate()
				}
			}
		}

		for _, query := range compositeQuery.BuilderQueries {
			if query.Expression != query.QueryName {
				expression, _ := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, evalFuncs)

				queryString, err := expressionToQuery(params, queries, expression)
				if err != nil {
					return nil, err
				}
				queries[query.QueryName] = queryString
			}
		}
	}
	return queries, nil
}
