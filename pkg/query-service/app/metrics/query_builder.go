package metrics

import (
	"fmt"
	"strings"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
)

type CHMetricQueries struct {
	Queries        []string
	FormulaQueries []string
	Err            error
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

func groupBy(tags []string) string {
	groupByFilter := "ts"
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

// BuildQueries builds the queries to be executed for query_range timeseries API
func BuildQueries(qp *model.QueryRangeParamsV2, tableName string) *CHMetricQueries {

	if qp.CompositeMetricQuery.RawQuery != "" {
		return &CHMetricQueries{Queries: []string{qp.CompositeMetricQuery.RawQuery}}
	}

	var queries []string
	for _, mq := range qp.CompositeMetricQuery.BuildMetricQueries {

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
			return &CHMetricQueries{Err: err}
		}

		samplesTableTimeFilter := fmt.Sprintf("timestamp_ms >= %d AND timestamp_ms < %d", qp.Start, qp.End)

		// Select the aggregate value for interval
		intermediateResult :=
			"SELECT %s" +
				" toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %s) as ts, " +
				" %s(value) as res" +
				" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_TABLENAME +
				" INNER JOIN " +
				" (%s) as filtered_time_series " +
				" USING fingerprint " +
				" WHERE " + samplesTableTimeFilter +
				" GROUP BY %s " +
				" ORDER BY ts"

		groupBy := groupBy(mq.GroupingTags)
		groupTags := groupSelect(mq.GroupingTags)

		switch mq.AggregateOperator {
		case "sum_rate", "avg_rate", "max_rate", "min_rate":
			op := strings.Split(mq.AggregateOperator, "_")[0]
			sub_query := fmt.Sprintf(intermediateResult, groupTags, qp.Step, op, filterSubQuery, groupBy)
			query := `SELECT %s ts, runningDifference(res)/runningDifference(ts) as res FROM(%s)`
			query = fmt.Sprintf(query, groupTags, sub_query)
			queries = append(queries, query)
		case "quantile":
			op := fmt.Sprintf("quantile(%v)", mq.Percentile)
			query := fmt.Sprintf(intermediateResult, groupTags, qp.Step, op, filterSubQuery, groupBy)
			queries = append(queries, query)
		default:
			query := fmt.Sprintf(intermediateResult, groupTags, qp.Step, mq.AggregateOperator, filterSubQuery, groupBy)
			queries = append(queries, query)
		}
	}

	var formulaSubQuery string
	for idx, query := range queries {
		mq := qp.CompositeMetricQuery.BuildMetricQueries[idx]
		groupTags := groupSelect(mq.GroupingTags)
		formulaSubQuery += fmt.Sprintf("(%s) as %c ", query, 97+idx)
		if idx < len(queries)-1 {
			formulaSubQuery += "INNER JOIN"
		} else if len(queries) > 1 {
			formulaSubQuery += fmt.Sprintf("USING (ts %s)", groupTags)
		}
	}
	// prepare formula queries
	var formulaQueries []string
	for _, formula := range qp.CompositeMetricQuery.Formulas {
		formulaQuery := fmt.Sprintf("SELECT ts, %s as res FROM ", formula) + formulaSubQuery
		formulaQueries = append(formulaQueries, formulaQuery)
	}

	return &CHMetricQueries{queries, formulaQueries, nil}
}
