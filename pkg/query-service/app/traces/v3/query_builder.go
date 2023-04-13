package traces

import (
	"fmt"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var aggregateOperatorToPercentile = map[v3.AggregateOperator]float64{
	v3.AggregateOperatorP05:         0.5,
	v3.AggregateOperatorP10:         0.10,
	v3.AggregateOperatorP20:         0.20,
	v3.AggregateOperatorP25:         0.25,
	v3.AggregateOperatorP50:         0.50,
	v3.AggregateOperatorP75:         0.75,
	v3.AggregateOperatorP90:         0.90,
	v3.AggregateOperatorP95:         0.95,
	v3.AggregateOperatorP99:         0.99,
	v3.AggregateOperatorHistQuant50: 0.50,
	v3.AggregateOperatorHistQuant75: 0.75,
	v3.AggregateOperatorHistQuant90: 0.90,
	v3.AggregateOperatorHistQuant95: 0.95,
	v3.AggregateOperatorHistQuant99: 0.99,
}

var aggregateOperatorToSQLFunc = map[v3.AggregateOperator]string{
	v3.AggregateOperatorAvg:     "avg",
	v3.AggregateOperatorMax:     "max",
	v3.AggregateOperatorMin:     "min",
	v3.AggregateOperatorSum:     "sum",
	v3.AggregateOperatorRate:    "count",
	v3.AggregateOperatorRateSum: "sum",
	v3.AggregateOperatorRateAvg: "avg",
	v3.AggregateOperatorRateMax: "max",
	v3.AggregateOperatorRateMin: "min",
}

var tracesOperatorMappingV3 = map[v3.FilterOperator]string{
	v3.FilterOperatorIn:              "IN",
	v3.FilterOperatorNotIn:           "NOT IN",
	v3.FilterOperatorEqual:           "=",
	v3.FilterOperatorNotEqual:        "!=",
	v3.FilterOperatorLessThan:        "<",
	v3.FilterOperatorLessThanOrEq:    "<=",
	v3.FilterOperatorGreaterThan:     ">",
	v3.FilterOperatorGreaterThanOrEq: ">=",
	v3.FilterOperatorLike:            "ILIKE",
	v3.FilterOperatorNotLike:         "NOT ILIKE",
	v3.FilterOperatorContains:        "ILIKE",
	v3.FilterOperatorNotContains:     "NOT ILIKE",
	v3.FilterOperatorExists:          "IS NOT NULL",
	v3.FilterOperatorNotExists:       "IS NULL",
}

func getFilter(key v3.AttributeKey) string {
	if key.IsColumn {
		return key.Key
	}
	filterType := key.Type
	filterDataType := "string"
	if key.DataType == v3.AttributeKeyDataTypeFloat64 || key.DataType == v3.AttributeKeyDataTypeInt64 {
		filterDataType = "float64"
	}
	if filterType == v3.AttributeKeyTypeTag {
		filterType = "TagMap"
	} else {
		filterType = "resourceTagsMap"
		filterDataType = ""
	}
	return fmt.Sprintf("%s%s['%s']", filterType, filterDataType, key.Key)
}

// getSelectLabels returns the select labels for the query based on groupBy and aggregateOperator
func getSelectLabels(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey) string {
	var selectLabels string
	if aggregatorOperator == v3.AggregateOperatorNoOp {
		selectLabels = ""
	} else {
		for _, tag := range groupBy {
			filterName := getFilter(tag)
			selectLabels += fmt.Sprintf(", %s as %s", filterName, tag.Key)
		}
	}
	return selectLabels
}

func buildTracesFilterQuery(fs *v3.FilterSet) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			toFormat := item.Value
			// generate the key
			columnName := getFilter(item.Key)
			fmtVal := utils.ClickHouseFormattedValue(toFormat)

			if operator, ok := tracesOperatorMappingV3[item.Operator]; ok {
				conditions = append(conditions, fmt.Sprintf("%s %s %s", columnName, operator, fmtVal))
			} else {
				return "", fmt.Errorf("unsupported operation")
			}
		}
	}
	queryString := strings.Join(conditions, " AND ")

	if len(queryString) > 0 {
		queryString = " AND " + queryString
	}
	return queryString, nil
}

func buildTracesQuery(start, end, step int64, mq *v3.BuilderQuery, tableName string) (string, error) {

	filterSubQuery, err := buildTracesFilterQuery(mq.Filters)
	if err != nil {
		return "", err
	}

	spanIndexTableTimeFilter := fmt.Sprintf("(timestamp >= '%d' AND timestamp <= '%d')", start, end)

	selectLabels := getSelectLabels(mq.AggregateOperator, mq.GroupBy)

	// Select the aggregate value for interval
	queryTmpl :=
		"SELECT toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts" + selectLabels +
			", %s as value " +
			"from " + constants.SIGNOZ_TRACE_DBNAME + "." + constants.SIGNOZ_SPAN_INDEX_TABLENAME +
			" where " + spanIndexTableTimeFilter + "%s " +
			"group by %s " +
			"order by %sts"

	// tagsWithoutLe is used to group by all tags except le
	// This is done because we want to group by le only when we are calculating quantile
	// Otherwise, we want to group by all tags except le
	// tagsWithoutLe := []string{}
	// for _, tag := range mq.GroupBy {
	// 	if tag.Key != "le" {
	// 		tagsWithoutLe = append(tagsWithoutLe, tag.Key)
	// 	}
	// }

	// groupByWithoutLe := groupBy(tagsWithoutLe...)
	// groupTagsWithoutLe := groupSelect(tagsWithoutLe...)
	// orderWithoutLe := orderBy(mq.OrderBy, tagsWithoutLe)

	groupBy := groupByAttributeKeyTags(mq.GroupBy...)
	// groupTags := groupSelectAttributeKeyTags(mq.GroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)

	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		aggregationKey = getFilter(mq.AggregateAttribute)
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin,
		v3.AggregateOperatorRate:
		rateQueryTmpl :=
			"SELECT toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts" +
				", %s as value " +
				"from " + constants.SIGNOZ_TRACE_DBNAME + "." + constants.SIGNOZ_SPAN_INDEX_TABLENAME +
				" where " + spanIndexTableTimeFilter + "%s " +
				"group by %s " +
				"order by %sts"
		op := fmt.Sprintf("%s(%s)/%d", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey, step)
		query := fmt.Sprintf(rateQueryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case
		v3.AggregateOperatorP05,
		v3.AggregateOperatorP10,
		v3.AggregateOperatorP20,
		v3.AggregateOperatorP25,
		v3.AggregateOperatorP50,
		v3.AggregateOperatorP75,
		v3.AggregateOperatorP90,
		v3.AggregateOperatorP95,
		v3.AggregateOperatorP99:
		op := fmt.Sprintf("quantile(%v)(%s)", aggregateOperatorToPercentile[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(%s)", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorCount:
		op := fmt.Sprintf("toFloat64(count(%s))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorNoOp:
		return "", fmt.Errorf("not implemented, part of traces page")
		// noOpQueryTmpl :=
		// 	"SELECT fingerprint, labels as fullLabels," +
		// 		" toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %d SECOND) as ts," +
		// 		" any(value) as value" +
		// 		" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_TABLENAME +
		// 		" GLOBAL INNER JOIN" +
		// 		" (%s)+ ORDER BY ts"
		// query := fmt.Sprintf(noOpQueryTmpl, step, filterSubQuery)
		// return query, nil
	default:
		return "", fmt.Errorf("unsupported aggregate operator")
	}
}

// groupBy returns a string of comma separated tags for group by clause
// `ts` is always added to the group by clause
func groupBy(tags ...string) string {
	tags = append(tags, "ts")
	return strings.Join(tags, ",")
}

// groupSelect returns a string of comma separated tags for select clause
func groupSelect(tags ...string) string {
	groupTags := strings.Join(tags, ",")
	if len(tags) != 0 {
		groupTags += ", "
	}
	return groupTags
}

func groupByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, getFilter(tag))
	}
	return groupBy(groupTags...)
}

func groupSelectAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, getFilter(tag))
	}
	return groupSelect(groupTags...)
}

// orderBy returns a string of comma separated tags for order by clause
// if the order is not specified, it defaults to ASC
func orderBy(items []v3.OrderBy, tags []string) string {
	var orderBy []string
	for _, tag := range tags {
		found := false
		for _, item := range items {
			if item.ColumnName == tag {
				found = true
				orderBy = append(orderBy, fmt.Sprintf("%s %s", item.ColumnName, item.Order))
				break
			}
		}
		if !found {
			orderBy = append(orderBy, fmt.Sprintf("%s ASC", tag))
		}
	}
	return strings.Join(orderBy, ",")
}

func orderByAttributeKeyTags(items []v3.OrderBy, tags []v3.AttributeKey) string {
	var groupTags []string
	for _, tag := range tags {
		groupTags = append(groupTags, getFilter(tag))
	}
	str := orderBy(items, groupTags)
	if len(str) > 0 {
		str = str + ","
	}
	return str
}

func having(items []v3.Having) string {
	var having []string
	for _, item := range items {
		having = append(having, fmt.Sprintf("%s %s %v", item.ColumnName, item.Operator, utils.ClickHouseFormattedValue(item.Value)))
	}
	return strings.Join(having, " AND ")
}

func reduceToQuery(query string, reduceTo v3.ReduceToOperator, aggregateOperator v3.AggregateOperator) (string, error) {
	// var selectLabels string
	var groupBy string
	// NOOP can possibly return multiple time series and reduce should be applied
	// for each uniques series. When the final result contains more than one series we throw
	// an error post DB fetching. Otherwise just return the single data. This is not known until queried so the
	// the query is prepared accordingly.
	// if aggregateOperator == v3.AggregateOperatorNoOp {
	// 	selectLabels = ", any(fullLabels) as fullLabels"
	// 	groupBy = "GROUP BY fingerprint"
	// }
	// the timestamp picked is not relevant here since the final value used is show the single
	// chart with just the query value. For the query
	switch reduceTo {
	case v3.ReduceToOperatorLast:
		query = fmt.Sprintf("SELECT anyLast(value) as value, any(ts) as ts FROM (%s) %s", query, groupBy)
	case v3.ReduceToOperatorSum:
		query = fmt.Sprintf("SELECT sum(value) as value, any(ts) as ts FROM (%s) %s", query, groupBy)
	case v3.ReduceToOperatorAvg:
		query = fmt.Sprintf("SELECT avg(value) as value, any(ts) as ts FROM (%s) %s", query, groupBy)
	case v3.ReduceToOperatorMax:
		query = fmt.Sprintf("SELECT max(value) as value, any(ts) as ts FROM (%s) %s", query, groupBy)
	case v3.ReduceToOperatorMin:
		query = fmt.Sprintf("SELECT min(value) as value, any(ts) as ts FROM (%s) %s", query, groupBy)
	default:
		return "", fmt.Errorf("unsupported reduce operator")
	}
	return query, nil
}

func PrepareTracesQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery) (string, error) {
	query, err := buildTracesQuery(start, end, mq.StepInterval, mq, constants.SIGNOZ_SPAN_INDEX_TABLENAME)
	if err != nil {
		return "", err
	}
	if panelType == v3.PanelTypeValue {
		query, err = reduceToQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}
	return query, err
}
