package v3

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
	v3.AggregateOperatorRateSum: "sum",
	v3.AggregateOperatorRateAvg: "avg",
	v3.AggregateOperatorRateMax: "max",
	v3.AggregateOperatorRateMin: "min",
}

var logsOperatorMappingV3 = map[string]string{
	"eq":     "=",
	"neq":    "!=",
	"lt":     "<",
	"lte":    "<=",
	"gt":     ">",
	"gte":    ">=",
	"like":   "LIKE",
	"nlike":  "NOT LIKE",
	"regex":  "REGEXP",
	"nregex": "NOT REGEXP",
	"in":     "IN",
	"nin":    "NOT IN",
	// (todo) check contains/not contains/exists/not exists
}

// getClickhouseColumnName returns the corresponding clickhouse column name for the given attribute/resource key
func getClickhouseColumnName(key v3.AttributeKey) string {
	clickhouseColumn := key.Key
	if !key.IsColumn {
		columnType := key.Type
		if columnType == v3.AttributeKeyTypeTag {
			columnType = "attributes"
		} else {
			columnType = "resources"
		}

		columnDataType := "string"
		if key.DataType == v3.AttributeKeyDataTypeNumber {
			columnDataType = "float64"
		}
		clickhouseColumn = fmt.Sprintf("%s_%s_value[indexOf(%s_%s_key, '%s')]", columnType, columnDataType, columnType, columnDataType, key.Key)
	}
	return clickhouseColumn
}

// getSelectLabels returns the select labels for the query based on groupBy and aggregateOperator
func getSelectLabels(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey) string {
	var selectLabels string
	if aggregatorOperator == v3.AggregateOperatorNoOp || aggregatorOperator == v3.AggregateOperatorRate {
		selectLabels = ""
	} else {
		for _, tag := range groupBy {
			columnName := getClickhouseColumnName(tag)
			selectLabels += fmt.Sprintf(", %s as %s", columnName, tag.Key)
		}
	}
	return selectLabels
}

func buildLogsTimeSeriesFilterQuery(fs *v3.FilterSet) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			toFormat := item.Value
			op := strings.ToLower(strings.TrimSpace(item.Operator))
			// if the received value is an array for like/match op, just take the first value
			// if op == "like" || op == "match" || op == "nlike" || op == "nmatch" {
			// 	x, ok := item.Value.([]interface{})
			// 	if ok {
			// 		if len(x) == 0 {
			// 			continue
			// 		}
			// 		toFormat = x[0]
			// 	}
			// }

			// generate the key
			columnName := getClickhouseColumnName(item.Key)
			fmtVal := utils.ClickHouseFormattedValue(toFormat)

			if operator, ok := logsOperatorMappingV3[op]; ok {
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

func buildLogsQuery(start, end, step int64, mq *v3.BuilderQuery, tableName string) (string, error) {

	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters)
	if err != nil {
		return "", err
	}

	samplesTableTimeFilter := fmt.Sprintf("(timestamp >= %d AND timestamp <= %d)", start, end)

	selectLabels := getSelectLabels(mq.AggregateOperator, mq.GroupBy)

	// Select the aggregate value for interval
	queryTmpl :=
		"SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL %d SECOND) AS ts" + selectLabels +
			", %s as value " +
			"from signoz_logs.distributed_logs " +
			"where " + samplesTableTimeFilter + "%s " +
			"group by %s " +
			"order by %sts"

	// tagsWithoutLe is used to group by all tags except le
	// This is done because we want to group by le only when we are calculating quantile
	// Otherwise, we want to group by all tags except le
	tagsWithoutLe := []string{}
	for _, tag := range mq.GroupBy {
		if tag.Key != "le" {
			tagsWithoutLe = append(tagsWithoutLe, tag.Key)
		}
	}

	// groupByWithoutLe := groupBy(tagsWithoutLe...)
	// groupTagsWithoutLe := groupSelect(tagsWithoutLe...)
	// orderWithoutLe := orderBy(mq.OrderBy, tagsWithoutLe)

	groupBy := groupByAttributeKeyTags(mq.GroupBy...)
	// groupTags := groupSelectAttributeKeyTags(mq.GroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)

	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		aggregationKey = getClickhouseColumnName(mq.AggregateAttribute)
	}

	switch mq.AggregateOperator {
	// case v3.AggregateOperatorRate:
	// 	// Calculate rate of change of metric for each unique time series
	// 	groupBy = "fingerprint, ts"
	// 	groupTags = "fingerprint,"
	// 	op := "max(value)" // max value should be the closest value for point in time
	// 	subQuery := fmt.Sprintf(
	// 		queryTmpl, "any(labels) as labels, "+groupTags, step, op, filterSubQuery, groupBy, orderBy,
	// 	) // labels will be same so any should be fine
	// 	query := `SELECT %s ts, ` + ` as value FROM(%s)`

	// 	// var rateWithoutNegative = `if (runningDifference(value) < 0 OR runningDifference(ts) < 0, nan, runningDifference(value)/runningDifference(ts))`

	// 	query = fmt.Sprintf(query, "labels as fullLabels,", subQuery)
	// 	return query, nil
	// case v3.AggregateOperatorSumRate:
	// 	rateGroupBy := "fingerprint, " + groupBy
	// 	rateGroupTags := "fingerprint, " + groupTags
	// 	rateOrderBy := "fingerprint, " + orderBy
	// 	op := "max(value)"
	// 	subQuery := fmt.Sprintf(
	// 		queryTmpl, rateGroupTags, step, op, filterSubQuery, rateGroupBy, rateOrderBy,
	// 	) // labels will be same so any should be fine
	// 	query := `SELECT %s ts, ` + rateWithoutNegative + `as value FROM(%s)`
	// 	query = fmt.Sprintf(query, groupTags, subQuery)
	// 	query = fmt.Sprintf(`SELECT %s ts, sum(value) as value FROM (%s) GROUP BY %s ORDER BY %s ts`, groupTags, query, groupBy, orderBy)
	// 	return query, nil
	// case
	// 	v3.AggregateOperatorRateSum,
	// 	v3.AggregateOperatorRateMax,
	// 	v3.AggregateOperatorRateAvg,
	// 	v3.AggregateOperatorRateMin:
	// 	op := fmt.Sprintf("%s(value)", aggregateOperatorToSQLFunc[mq.AggregateOperator])
	// 	subQuery := fmt.Sprintf(queryTmpl, groupTags, step, op, filterSubQuery, groupBy, orderBy)
	// 	query := `SELECT %s ts, ` + rateWithoutNegative + `as value FROM(%s)`
	// 	query = fmt.Sprintf(query, groupTags, subQuery)
	// 	return query, nil
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
	// case v3.AggregateOperatorHistQuant50, v3.AggregateOperatorHistQuant75, v3.AggregateOperatorHistQuant90, v3.AggregateOperatorHistQuant95, v3.AggregateOperatorHistQuant99:
	// 	rateGroupBy := "fingerprint, " + groupBy
	// 	rateGroupTags := "fingerprint, " + groupTags
	// 	rateOrderBy := "fingerprint, " + orderBy
	// 	op := "max(value)"
	// 	subQuery := fmt.Sprintf(
	// 		queryTmpl, rateGroupTags, step, op, filterSubQuery, rateGroupBy, rateOrderBy,
	// 	) // labels will be same so any should be fine
	// 	query := `SELECT %s ts, ` + rateWithoutNegative + ` as value FROM(%s)`
	// 	query = fmt.Sprintf(query, groupTags, subQuery)
	// 	query = fmt.Sprintf(`SELECT %s ts, sum(value) as value FROM (%s) GROUP BY %s ORDER BY %s ts`, groupTags, query, groupBy, orderBy)
	// 	value := aggregateOperatorToPercentile[mq.AggregateOperator]

	// 	query = fmt.Sprintf(`SELECT %s ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), %.3f) as value FROM (%s) GROUP BY %s ORDER BY %s ts`, groupTagsWithoutLe, value, query, groupByWithoutLe, orderWithoutLe)
	// 	return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(%s)", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOpeatorCount:
		op := fmt.Sprintf("toFloat64(count(%s))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorNoOp:
		// queryTmpl :=
		// 	"SELECT fingerprint, labels as fullLabels," +
		// 		" toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %d SECOND) as ts," +
		// 		" any(value) as value" +
		// 		" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_TABLENAME +
		// 		" GLOBAL INNER JOIN" +
		// 		" (%s) as filtered_time_series" +
		// 		" USING fingerprint" +
		// 		" WHERE " + samplesTableTimeFilter +
		// 		" GROUP BY fingerprint, labels, ts" +
		// 		" ORDER BY fingerprint, labels, ts"
		// queryTmpl :=
		// 	"SELECT * from logs"
		query := fmt.Sprintf(queryTmpl, step, filterSubQuery)
		return query, nil
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
// func groupSelect(tags ...string) string {
// 	groupTags := strings.Join(tags, ",")
// 	if len(tags) != 0 {
// 		groupTags += ", "
// 	}
// 	return groupTags
// }

func groupByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, tag.Key)
	}
	return groupBy(groupTags...)
}

// func groupSelectAttributeKeyTags(tags ...v3.AttributeKey) string {
// 	groupTags := []string{}
// 	for _, tag := range tags {
// 		groupTags = append(groupTags, tag.Key)
// 	}
// 	return groupSelect(groupTags...)
// }

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
		groupTags = append(groupTags, tag.Key)
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

// todo(nitya): implement reduceQuery
func reduceQuery(query string, reduceTo v3.ReduceToOperator, aggregateOperator v3.AggregateOperator) (string, error) {
	return "", nil
}

func PrepareLogsQuery(start, end, step int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery) (string, error) {
	query, err := buildLogsQuery(start, end, step, mq, constants.SIGNOZ_TIMESERIES_TABLENAME)
	if err != nil {
		return "", err
	}
	if panelType == v3.PanelTypeValue {
		query, err = reduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}
	return query, err
}
