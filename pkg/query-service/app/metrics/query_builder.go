package metrics

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/SigNoz/govaluate"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
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

// FormattedValue formats the value to be used in clickhouse query
func FormattedValue(v interface{}) string {
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

// BuildMetricsTimeSeriesFilterQuery builds the sub-query to be used for filtering
// timeseries based on search criteria
func BuildMetricsTimeSeriesFilterQuery(fs *model.FilterSet, groupTags []string, metricName string, aggregateOperator model.AggregateOperator) (string, error) {
	var conditions []string
	conditions = append(conditions, fmt.Sprintf("metric_name = %s", FormattedValue(metricName)))
	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			toFormat := item.Value
			op := strings.ToLower(strings.TrimSpace(item.Operator))
			// if the received value is an array for like/match op, just take the first value
			if op == "like" || op == "match" || op == "nlike" || op == "nmatch" {
				x, ok := item.Value.([]interface{})
				if ok {
					if len(x) == 0 {
						continue
					}
					toFormat = x[0]
				}
			}
			fmtVal := FormattedValue(toFormat)
			switch op {
			case "eq":
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') = %s", item.Key, fmtVal))
			case "neq":
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') != %s", item.Key, fmtVal))
			case "in":
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') IN %s", item.Key, fmtVal))
			case "nin":
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') NOT IN %s", item.Key, fmtVal))
			case "like":
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key, fmtVal))
			case "nlike":
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key, fmtVal))
			case "match":
				conditions = append(conditions, fmt.Sprintf("match(JSONExtractString(labels, '%s'), %s)", item.Key, fmtVal))
			case "nmatch":
				conditions = append(conditions, fmt.Sprintf("not match(JSONExtractString(labels, '%s'), %s)", item.Key, fmtVal))
			default:
				return "", fmt.Errorf("unsupported operation")
			}
		}
	}
	queryString := strings.Join(conditions, " AND ")

	var selectLabels string
	if aggregateOperator == model.NOOP || aggregateOperator == model.RATE {
		selectLabels = "labels,"
	} else {
		for _, tag := range groupTags {
			selectLabels += fmt.Sprintf(" JSONExtractString(labels, '%s') as %s,", tag, tag)
		}
	}

	filterSubQuery := fmt.Sprintf("SELECT %s fingerprint FROM %s.%s WHERE %s", selectLabels, constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_LOCAL_TABLENAME, queryString)

	return filterSubQuery, nil
}

func BuildMetricQuery(qp *model.QueryRangeParamsV2, mq *model.MetricQuery, tableName string) (string, error) {

	if qp.CompositeMetricQuery.PanelType == model.QUERY_VALUE && len(mq.GroupingTags) != 0 {
		return "", fmt.Errorf("reduce operator cannot be applied for the query")
	}

	filterSubQuery, err := BuildMetricsTimeSeriesFilterQuery(mq.TagFilters, mq.GroupingTags, mq.MetricName, mq.AggregateOperator)
	if err != nil {
		return "", err
	}

	samplesTableTimeFilter := fmt.Sprintf("metric_name = %s AND timestamp_ms >= %d AND timestamp_ms <= %d", FormattedValue(mq.MetricName), qp.Start, qp.End)

	// Select the aggregate value for interval
	queryTmpl :=
		"SELECT %s" +
			" toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %d SECOND) as ts," +
			" %s as value" +
			" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_TABLENAME +
			" INNER JOIN" +
			" (%s) as filtered_time_series" +
			" USING fingerprint" +
			" WHERE " + samplesTableTimeFilter +
			" GROUP BY %s" +
			" ORDER BY %s ts"

	groupBy := groupBy(mq.GroupingTags...)
	groupTags := groupSelect(mq.GroupingTags...)

	switch mq.AggregateOperator {
	case model.RATE:
		// Calculate rate of change of metric for each unique time series
		groupBy = "fingerprint, ts"
		groupTags = "fingerprint,"
		op := "max(value)" // max value should be the closest value for point in time
		subQuery := fmt.Sprintf(
			queryTmpl, "any(labels) as labels, "+groupTags, qp.Step, op, filterSubQuery, groupBy, groupTags,
		) // labels will be same so any should be fine
		query := `SELECT %s ts, runningDifference(value)/runningDifference(ts) as value FROM(%s)`

		query = fmt.Sprintf(query, "labels as fullLabels,", subQuery)
		return query, nil
	case model.SUM_RATE:
		rateGroupBy := "fingerprint, " + groupBy
		rateGroupTags := "fingerprint, " + groupTags
		op := "max(value)"
		subQuery := fmt.Sprintf(
			queryTmpl, rateGroupTags, qp.Step, op, filterSubQuery, rateGroupBy, rateGroupTags,
		) // labels will be same so any should be fine
		query := `SELECT %s ts, runningDifference(value)/runningDifference(ts) as value FROM(%s) OFFSET 1`
		query = fmt.Sprintf(query, groupTags, subQuery)
		query = fmt.Sprintf(`SELECT %s ts, sum(value) as value FROM (%s) GROUP BY %s ORDER BY %s ts`, groupTags, query, groupBy, groupTags)
		return query, nil
	case model.RATE_SUM, model.RATE_MAX, model.RATE_AVG, model.RATE_MIN:
		op := fmt.Sprintf("%s(value)", AggregateOperatorToSQLFunc[mq.AggregateOperator])
		subQuery := fmt.Sprintf(queryTmpl, groupTags, qp.Step, op, filterSubQuery, groupBy, groupTags)
		query := `SELECT %s ts, runningDifference(value)/runningDifference(ts) as value FROM(%s) OFFSET 1`
		query = fmt.Sprintf(query, groupTags, subQuery)
		return query, nil
	case model.P05, model.P10, model.P20, model.P25, model.P50, model.P75, model.P90, model.P95, model.P99:
		op := fmt.Sprintf("quantile(%v)(value)", AggregateOperatorToPercentile[mq.AggregateOperator])
		query := fmt.Sprintf(queryTmpl, groupTags, qp.Step, op, filterSubQuery, groupBy, groupTags)
		return query, nil
	case model.AVG, model.SUM, model.MIN, model.MAX:
		op := fmt.Sprintf("%s(value)", AggregateOperatorToSQLFunc[mq.AggregateOperator])
		query := fmt.Sprintf(queryTmpl, groupTags, qp.Step, op, filterSubQuery, groupBy, groupTags)
		return query, nil
	case model.COUNT:
		op := "toFloat64(count(*))"
		query := fmt.Sprintf(queryTmpl, groupTags, qp.Step, op, filterSubQuery, groupBy, groupTags)
		return query, nil
	case model.COUNT_DISTINCT:
		op := "toFloat64(count(distinct(value)))"
		query := fmt.Sprintf(queryTmpl, groupTags, qp.Step, op, filterSubQuery, groupBy, groupTags)
		return query, nil
	case model.NOOP:
		queryTmpl :=
			"SELECT fingerprint, labels as fullLabels," +
				" toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %d SECOND) as ts," +
				" any(value) as value" +
				" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_TABLENAME +
				" INNER JOIN" +
				" (%s) as filtered_time_series" +
				" USING fingerprint" +
				" WHERE " + samplesTableTimeFilter +
				" GROUP BY fingerprint, labels, ts" +
				" ORDER BY fingerprint, labels, ts"
		query := fmt.Sprintf(queryTmpl, qp.Step, filterSubQuery)
		return query, nil
	default:
		return "", fmt.Errorf("unsupported aggregate operator")
	}
}

func groupBy(tags ...string) string {
	tags = append(tags, "ts")
	return strings.Join(tags, ",")
}

func groupSelect(tags ...string) string {
	groupTags := strings.Join(tags, ",")
	if len(tags) != 0 {
		groupTags += ", "
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

func reduceQuery(query string, reduceTo model.ReduceToOperator, aggregateOperator model.AggregateOperator) (string, error) {
	var selectLabels string
	var groupBy string
	// NOOP and RATE can possibly return multiple time series and reduce should be applied
	// for each uniques series. When the final result contains more than one series we throw
	// an error post DB fetching. Otherwise just return the single data. This is not known until queried so the
	// the query is prepared accordingly.
	if aggregateOperator == model.NOOP || aggregateOperator == model.RATE {
		selectLabels = ", any(fullLabels) as fullLabels"
		groupBy = "GROUP BY fingerprint"
	}
	// the timestamp picked is not relevant here since the final value used is show the single
	// chart with just the query value. For the quer
	switch reduceTo {
	case model.RLAST:
		query = fmt.Sprintf("SELECT anyLast(value) as value, any(ts) as ts %s FROM (%s) %s", selectLabels, query, groupBy)
	case model.RSUM:
		query = fmt.Sprintf("SELECT sum(value) as value, any(ts) as ts %s FROM (%s) %s", selectLabels, query, groupBy)
	case model.RAVG:
		query = fmt.Sprintf("SELECT avg(value) as value, any(ts) as ts %s FROM (%s) %s", selectLabels, query, groupBy)
	case model.RMAX:
		query = fmt.Sprintf("SELECT max(value) as value, any(ts) as ts %s FROM (%s) %s", selectLabels, query, groupBy)
	case model.RMIN:
		query = fmt.Sprintf("SELECT min(value) as value, any(ts) as ts %s FROM (%s) %s", selectLabels, query, groupBy)
	default:
		return "", fmt.Errorf("unsupported reduce operator")
	}
	return query, nil
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
				} else {
					if qp.CompositeMetricQuery.PanelType == model.QUERY_VALUE {
						query, err = reduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
						if err != nil {
							errs = append(errs, err)
						}
					}
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
			token.Value = fmt.Sprintf("%v.value", token.Value)
			token.Meta = fmt.Sprintf("%v.value", token.Meta)
		}
		modified = append(modified, token)
	}
	formula, _ := govaluate.NewEvaluableExpressionFromTokens(modified)

	var formulaSubQuery string
	var joinUsing string
	for idx, var_ := range vars {
		query := varToQuery[var_]
		groupTags := qp.CompositeMetricQuery.BuilderQueries[var_].GroupingTags
		groupTags = append(groupTags, "ts")
		joinUsing = strings.Join(groupTags, ",")
		formulaSubQuery += fmt.Sprintf("(%s) as %s ", query, var_)
		if idx < len(vars)-1 {
			formulaSubQuery += "INNER JOIN"
		} else if len(vars) > 1 {
			formulaSubQuery += fmt.Sprintf("USING (%s)", joinUsing)
		}
	}
	formulaQuery = fmt.Sprintf("SELECT %s, %s as value FROM ", joinUsing, formula.ExpressionString()) + formulaSubQuery
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
		if builderQuery.Disabled {
			continue
		}
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
	return &RunQueries{Queries: namedQueries}
}

// PromFormattedValue formats the value to be used in promql
func PromFormattedValue(v interface{}) string {
	switch x := v.(type) {
	case int:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return fmt.Sprintf("%s", x)
	case bool:
		return fmt.Sprintf("%v", x)
	case []interface{}:
		if len(x) == 0 {
			return ""
		}
		switch x[0].(type) {
		case string, int, float32, float64, bool:
			return strings.Trim(strings.Join(strings.Fields(fmt.Sprint(x)), "|"), "[]")
		default:
			zap.L().Error("invalid type for prom formatted value", zap.Any("type", reflect.TypeOf(x[0])))
			return ""
		}
	default:
		zap.L().Error("invalid type for prom formatted value", zap.Any("type", reflect.TypeOf(x)))
		return ""
	}
}
