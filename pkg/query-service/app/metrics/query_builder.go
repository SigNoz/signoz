package metrics

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/SigNoz/govaluate"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
)

type RunQueries struct {
	Queries map[string]string
	Err     error
}

var AggregateOperatorToPercentile = map[model.AggregateOperator]float64{
	model.P05: 0.5,
	model.P10: 0.10,
	model.P20: 0.20,
	model.P25: 0.25,
	model.P50: 0.50,
	model.P75: 0.75,
	model.P90: 0.90,
	model.P95: 0.95,
	model.P99: 0.99,
}

var AggregateOperatorToSQLFunc = map[model.AggregateOperator]string{
	model.AVG:      "avg",
	model.MAX:      "max",
	model.MIN:      "min",
	model.SUM:      "sum",
	model.RATE_SUM: "sum",
	model.RATE_AVG: "avg",
	model.RATE_MAX: "max",
	model.RATE_MIN: "min",
}

var SupportedFunctions = []string{"exp", "log", "ln", "exp2", "log2", "exp10", "log10", "sqrt", "cbrt", "erf", "erfc", "lgamma", "tgamma", "sin", "cos", "tan", "asin", "acos", "atan", "degrees", "radians"}

func GoValuateFuncs() map[string]govaluate.ExpressionFunction {
	var GoValuateFuncs = map[string]govaluate.ExpressionFunction{}
	for _, fn := range SupportedFunctions {
		GoValuateFuncs[fn] = func(args ...interface{}) (interface{}, error) {
			return nil, nil
		}
	}
	return GoValuateFuncs
}

// formattedValue formats the value to be used in clickhouse query
func formattedValue(v interface{}) string {
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
		}
		return ""
	default:
		// may be log the warning here?
		return ""
	}
}

// BuildMetricsTimeSeriesFilterQuery builds the sub-query to be used for filtering
// timeseries based on search criteria
func BuildMetricsTimeSeriesFilterQuery(fs *model.FilterSet, tableName string) (string, error) {
	queryString := ""
	for idx, item := range fs.Items {
		fmtVal := formattedValue(item.Value)
		switch op := strings.ToLower(item.Operation); op {
		case "eq":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') = %s", tableName, item.Key, fmtVal)
		case "neq":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') != %s", tableName, item.Key, fmtVal)
		case "in":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') IN %s", tableName, item.Key, fmtVal)
		case "nin":
			queryString += fmt.Sprintf("JSONExtractString(%s.labels,'%s') NOT IN %s", tableName, item.Key, fmtVal)
		case "like":
			queryString += fmt.Sprintf("like(JSONExtractString(%s.labels,'%s'), %s)", tableName, item.Key, fmtVal)
		case "match":
			queryString += fmt.Sprintf("match(JSONExtractString(%s.labels,'%s'), %s)", tableName, item.Key, fmtVal)
		default:
			return "", fmt.Errorf("unsupported operation")
		}
		if idx != len(fs.Items)-1 {
			queryString += " " + fs.Operation + " "
		}
	}

	filterSubQuery := fmt.Sprintf("SELECT fingerprint, labels FROM %s.%s WHERE %s", constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_TABLENAME, queryString)

	return filterSubQuery, nil
}

func BuildMetricQuery(qp *model.QueryRangeParamsV2, mq *model.MetricQuery, tableName string) (string, error) {
	nameFilterItem := model.FilterItem{Key: "__name__", Value: mq.MetricName, Operation: "EQ"}
	if mq.TagFilters == nil {
		mq.TagFilters = &model.FilterSet{Operation: "AND", Items: []model.FilterItem{
			nameFilterItem,
		}}
	} else {
		mq.TagFilters.Items = append(mq.TagFilters.Items, nameFilterItem)
	}

	filterSubQuery, err := BuildMetricsTimeSeriesFilterQuery(mq.TagFilters, tableName)
	if err != nil {
		return "", err
	}

	samplesTableTimeFilter := fmt.Sprintf("timestamp_ms >= %d AND timestamp_ms < %d", qp.Start, qp.End)

	// Select the aggregate value for interval
	intermediateResult :=
		"SELECT fingerprint, %s" +
			" toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %d SECOND) as ts, " +
			" %s as res" +
			" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_TABLENAME +
			" INNER JOIN " +
			" (%s) as filtered_time_series " +
			" USING fingerprint " +
			" WHERE " + samplesTableTimeFilter +
			" GROUP BY %s " +
			" ORDER BY fingerprint, ts"

	groupBy := groupBy(mq.GroupingTags)
	groupTags := groupSelect(mq.GroupingTags)

	switch mq.AggregateOperator {
	case model.RATE_SUM, model.RATE_MAX, model.RATE_AVG, model.RATE_MIN:
		op := fmt.Sprintf("%s(value)", AggregateOperatorToSQLFunc[mq.AggregateOperator])
		sub_query := fmt.Sprintf(intermediateResult, groupTags, qp.Step, op, filterSubQuery, groupBy)
		query := `SELECT %s ts, runningDifference(res)/runningDifference(ts) as res FROM(%s)`
		query = fmt.Sprintf(query, groupTags, sub_query)
		return query, nil
	case model.P05, model.P10, model.P20, model.P25, model.P50, model.P75, model.P90, model.P95, model.P99:
		op := fmt.Sprintf("quantile(%v)(value)", AggregateOperatorToPercentile[mq.AggregateOperator])
		query := fmt.Sprintf(intermediateResult, groupTags, qp.Step, op, filterSubQuery, groupBy)
		return query, nil
	case model.AVG, model.SUM, model.MIN, model.MAX:
		op := fmt.Sprintf("%s(value)", AggregateOperatorToSQLFunc[mq.AggregateOperator])
		query := fmt.Sprintf(intermediateResult, groupTags, qp.Step, op, filterSubQuery, groupBy)
		return query, nil
	case model.COUNT:
		op := "count(*)"
		query := fmt.Sprintf(intermediateResult, groupTags, qp.Step, op, filterSubQuery, groupBy)
		return query, nil
	case model.COUNT_DISTINCT:
	default:
		return "", fmt.Errorf("unsupported aggregate operator")
	}
	return "", fmt.Errorf("unsupported aggregate operator")
}

func groupBy(tags []string) string {
	groupByFilter := "fingerprint, ts"
	for _, tag := range tags {
		groupByFilter += fmt.Sprintf(", JSONExtractString(labels,'%s') as %s", tag, tag)
	}
	return groupByFilter
}

func groupSelect(tags []string) string {
	groupTags := strings.Join(tags, ",")
	if len(tags) != 0 {
		groupTags += ","
	}
	return groupTags
}

// validateExpressions validates the math expressions using the list of
// allowed functions.
func validateExpressions(expressions []string, funcs map[string]govaluate.ExpressionFunction) []error {
	var errs []error
	for _, exp := range expressions {
		_, err := govaluate.NewEvaluableExpressionWithFunctions(exp, funcs)
		if err != nil {
			errs = append(errs, err)
		}
	}
	return errs
}

// FormatErrs returns formatted error string
func FormatErrs(errs []error, separator string) string {
	var errStrs []string
	for _, err := range errs {
		errStrs = append(errStrs, err.Error())
	}
	return strings.Join(errStrs, separator)
}

// varToQuery constructs the query for each named builder block
func varToQuery(qp *model.QueryRangeParamsV2, tableName string) (map[string]string, error) {
	evalFuncs := GoValuateFuncs()
	varToQuery := make(map[string]string)
	for _, builderQuery := range qp.CompositeMetricQuery.BuilderQueries {
		expression, _ := govaluate.NewEvaluableExpressionWithFunctions(builderQuery.Expression, evalFuncs)

		// Use the parsed expression and build the query for each variable
		// if not already exists
		var errs []error
		for _, _var := range expression.Vars() {
			if _, ok := varToQuery[_var]; !ok {
				mq := qp.CompositeMetricQuery.BuilderQueries[_var]
				query, err := BuildMetricQuery(qp, mq, tableName)
				if err != nil {
					errs = append(errs, err)
				}
				varToQuery[_var] = query
			}
		}
		if len(errs) != 0 {
			return nil, fmt.Errorf("error while creating query: %s", FormatErrs(errs, "\n"))
		}
	}
	return varToQuery, nil
}

// expressionToQuery constructs the query for the expression
func expressionToQuery(qp *model.QueryRangeParamsV2, varToQuery map[string]string, expression *govaluate.EvaluableExpression) (string, error) {
	var formulaQuery string
	vars := expression.Vars()
	for idx, var_ := range vars[1:] {
		x, y := vars[idx], var_
		if !reflect.DeepEqual(qp.CompositeMetricQuery.BuilderQueries[x].GroupingTags, qp.CompositeMetricQuery.BuilderQueries[y].GroupingTags) {
			return "", fmt.Errorf("group by must be same")
		}
	}
	var modified []govaluate.ExpressionToken
	tokens := expression.Tokens()
	for idx := range tokens {
		token := tokens[idx]
		if token.Kind == govaluate.VARIABLE {
			token.Value = fmt.Sprintf("%v.res", token.Value)
			token.Meta = fmt.Sprintf("%v.res", token.Meta)
		}
		modified = append(modified, token)
	}
	formula, _ := govaluate.NewEvaluableExpressionFromTokens(modified)

	var formulaSubQuery string
	for idx, var_ := range vars {
		query := varToQuery[var_]
		groupTags := strings.Join(qp.CompositeMetricQuery.BuilderQueries[var_].GroupingTags, ",")
		formulaSubQuery += fmt.Sprintf("(%s) as %s ", query, var_)
		if idx < len(vars)-1 {
			formulaSubQuery += "INNER JOIN"
		} else if len(vars) > 1 {
			formulaSubQuery += fmt.Sprintf("USING (ts, %s)", groupTags)
		}
	}
	formulaQuery = fmt.Sprintf("SELECT ts, %s as res FROM ", formula.ExpressionString()) + formulaSubQuery
	return formulaQuery, nil
}

// PrepareBuilderMetricQueries constructs the queries to be run for query range timeseries
func PrepareBuilderMetricQueries(qp *model.QueryRangeParamsV2, tableName string) *RunQueries {
	evalFuncs := GoValuateFuncs()

	// validate the expressions
	var expressions []string
	for _, bq := range qp.CompositeMetricQuery.BuilderQueries {
		expressions = append(expressions, bq.Expression)
	}
	if errs := validateExpressions(expressions, evalFuncs); len(errs) != 0 {
		return &RunQueries{Err: fmt.Errorf("invalid expressions: %s", FormatErrs(errs, "\n"))}
	}

	varToQuery, err := varToQuery(qp, tableName)
	if err != nil {
		return &RunQueries{Err: err}
	}

	namedQueries := make(map[string]string)

	var errs []error
	for _, builderQuery := range qp.CompositeMetricQuery.BuilderQueries {
		expression, _ := govaluate.NewEvaluableExpressionWithFunctions(builderQuery.Expression, evalFuncs)
		tokens := expression.Tokens()
		// expression with one token is used to represent
		// that there are no functions applied on query
		if len(tokens) == 1 {
			_var := tokens[0].Value.(string)
			namedQueries[builderQuery.QueryName] = varToQuery[_var]
		} else {
			query, err := expressionToQuery(qp, varToQuery, expression)
			if err != nil {
				errs = append(errs, err)
			}
			namedQueries[builderQuery.QueryName] = query
		}
	}
	if len(errs) != 0 {
		return &RunQueries{Err: fmt.Errorf("errors with formulas: %s", FormatErrs(errs, "\n"))}
	}
	fmt.Println(namedQueries)
	return &RunQueries{Queries: namedQueries}
}
