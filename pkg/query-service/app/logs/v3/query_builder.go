package v3

import (
	"fmt"
	"math"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var aggregateOperatorToPercentile = map[v3.AggregateOperator]float64{
	v3.AggregateOperatorP05:         0.05,
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

var logsOperatorsEnabled = map[v3.FilterOperator]struct{}{
	v3.FilterOperatorEqual:           {},
	v3.FilterOperatorNotEqual:        {},
	v3.FilterOperatorLessThan:        {},
	v3.FilterOperatorLessThanOrEq:    {},
	v3.FilterOperatorGreaterThan:     {},
	v3.FilterOperatorGreaterThanOrEq: {},
	v3.FilterOperatorLike:            {},
	v3.FilterOperatorNotLike:         {},
	v3.FilterOperatorRegex:           {},
	v3.FilterOperatorNotRegex:        {},
	v3.FilterOperatorIn:              {},
	v3.FilterOperatorNotIn:           {},
	// (todo) check contains/not contains/exists/not exists
}

// getClickhouseColumnName returns the corresponding clickhouse column name for the given attribute/resource key
func getClickhouseColumnName(key v3.AttributeKey, fields map[string]v3.AttributeKey) (string, error) {
	clickhouseColumn := key.Key
	//if the key is present in the topLevelColumn then it will be only searched in those columns,
	//regardless if it is indexed/present again in resource or column attribute
	_, isTopLevelCol := constants.LogsTopLevelColumnsV3[key.Key]
	if !isTopLevelCol && !key.IsColumn {
		// check if we need to enrich metadata
		if key.Type == "" || key.DataType == "" {
			// check if the field is present in the fields map
			if field, ok := fields[key.Key]; ok {
				if field.IsColumn {
					return field.Key, nil
				}
				key.Type = field.Type
				key.DataType = field.DataType
			} else {
				return "", fmt.Errorf("field not found to enrich metadata")
			}
		}

		columnType := key.Type
		if columnType == v3.AttributeKeyTypeTag {
			columnType = "attributes"
		} else {
			columnType = "resources"
		}

		columnDataType := "string"
		if key.DataType == v3.AttributeKeyDataTypeFloat64 {
			columnDataType = "float64"
		}
		if key.DataType == v3.AttributeKeyDataTypeInt64 {
			columnDataType = "int64"
		}
		clickhouseColumn = fmt.Sprintf("%s_%s_value[indexOf(%s_%s_key, '%s')]", columnType, columnDataType, columnType, columnDataType, key.Key)
	}
	return clickhouseColumn, nil
}

// getSelectLabels returns the select labels for the query based on groupBy and aggregateOperator
func getSelectLabels(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey, fields map[string]v3.AttributeKey) (string, error) {
	var selectLabels string
	if aggregatorOperator == v3.AggregateOperatorNoOp {
		selectLabels = ""
	} else {
		for _, tag := range groupBy {
			columnName, err := getClickhouseColumnName(tag, fields)
			if err != nil {
				return "", err
			}
			selectLabels += fmt.Sprintf(", %s as %s", columnName, tag.Key)
		}
	}
	return selectLabels, nil
}

func buildLogsTimeSeriesFilterQuery(fs *v3.FilterSet, fields map[string]v3.AttributeKey) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			toFormat := item.Value
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))

			// generate the key
			columnName, err := getClickhouseColumnName(item.Key, fields)
			if err != nil {
				return "", err
			}
			fmtVal := utils.ClickHouseFormattedValue(toFormat)

			if _, ok := logsOperatorsEnabled[op]; ok {
				conditions = append(conditions, fmt.Sprintf("%s %s %s", columnName, op, fmtVal))
			} else {
				return "", fmt.Errorf("unsupported operator: %s", op)
			}
		}
	}
	queryString := strings.Join(conditions, " AND ")

	if len(queryString) > 0 {
		queryString = " AND " + queryString
	}
	return queryString, nil
}

func getZerosForEpochNano(epoch int64) int64 {
	count := 0
	if epoch == 0 {
		count = 1
	} else {
		for epoch != 0 {
			epoch /= 10
			count++
		}
	}
	return int64(math.Pow(10, float64(19-count)))
}

func buildLogsQuery(start, end, step int64, mq *v3.BuilderQuery, fields map[string]v3.AttributeKey) (string, error) {

	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, fields)
	if err != nil {
		return "", err
	}

	// timerange will be sent in epoch millisecond
	timeFilter := fmt.Sprintf("(timestamp >= %d AND timestamp <= %d)", start*getZerosForEpochNano(start), end*getZerosForEpochNano(end))

	selectLabels, err := getSelectLabels(mq.AggregateOperator, mq.GroupBy, fields)
	if err != nil {
		return "", err
	}

	queryTmpl :=
		"SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL %d SECOND) AS ts" + selectLabels +
			", %s as value " +
			"from signoz_logs.distributed_logs " +
			"where " + timeFilter + "%s " +
			"group by %s " +
			"order by %sts"

	groupBy := groupByAttributeKeyTags(mq.GroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)

	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		aggregationKey, err = getClickhouseColumnName(mq.AggregateAttribute, fields)
		if err != nil {
			return "", err
		}
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRate:
		op := fmt.Sprintf("count(%s)/%d", aggregationKey, step)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin:
		op := fmt.Sprintf("%s(%s)/%d", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey, step)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
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
	case v3.AggregateOpeatorCount:
		op := "toFloat64(count(*))"
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, orderBy)
		return query, nil
	case v3.AggregateOperatorNoOp:
		queryTmpl := constants.LogsSQLSelect + "from signoz_logs.distributed_logs where %s %s"
		query := fmt.Sprintf(queryTmpl, timeFilter, filterSubQuery)
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

func groupByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, tag.Key)
	}
	return groupBy(groupTags...)
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

	// users might want to order by value of aggreagation
	for _, item := range items {
		if item.ColumnName == constants.SigNozOrderByValue {
			orderBy = append(orderBy, fmt.Sprintf("value %s", item.Order))
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
	// aggregate something and filter on that aggregate
	var having []string
	for _, item := range items {
		having = append(having, fmt.Sprintf("%s %s %v", item.ColumnName, item.Operator, utils.ClickHouseFormattedValue(item.Value)))
	}
	return strings.Join(having, " AND ")

}

func reduceQuery(query string, reduceTo v3.ReduceToOperator, aggregateOperator v3.AggregateOperator) (string, error) {
	// the timestamp picked is not relevant here since the final value used is show the single
	// chart with just the query value.
	switch reduceTo {
	case v3.ReduceToOperatorLast:
		query = fmt.Sprintf("SELECT anyLast(value) as value, any(ts) as ts FROM (%s)", query)
	case v3.ReduceToOperatorSum:
		query = fmt.Sprintf("SELECT sum(value) as value, any(ts) as ts FROM (%s)", query)
	case v3.ReduceToOperatorAvg:
		query = fmt.Sprintf("SELECT avg(value) as value, any(ts) as ts FROM (%s)", query)
	case v3.ReduceToOperatorMax:
		query = fmt.Sprintf("SELECT max(value) as value, any(ts) as ts FROM (%s)", query)
	case v3.ReduceToOperatorMin:
		query = fmt.Sprintf("SELECT min(value) as value, any(ts) as ts FROM (%s)", query)
	default:
		return "", fmt.Errorf("unsupported reduce operator")
	}
	return query, nil
}

func addLimitToQuery(query string, limit uint64, panelType v3.PanelType) string {
	if limit == 0 && panelType == v3.PanelTypeList {
		limit = 100
	}
	return fmt.Sprintf("%s LIMIT %d", query, limit)
}

func addOffsetToQuery(query string, offset uint64) string {
	return fmt.Sprintf("%s OFFSET %d", query, offset)
}

func PrepareLogsQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, fields map[string]v3.AttributeKey) (string, error) {
	query, err := buildLogsQuery(start, end, mq.StepInterval, mq, fields)
	if err != nil {
		return "", err
	}
	if panelType == v3.PanelTypeValue {
		query, err = reduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}

	query = addLimitToQuery(query, mq.Limit, panelType)

	if mq.Offset != 0 {
		query = addOffsetToQuery(query, mq.Offset)
	}

	return query, err
}
