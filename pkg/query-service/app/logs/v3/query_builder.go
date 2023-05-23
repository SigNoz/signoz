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
	v3.AggregateOperatorP05: 0.05,
	v3.AggregateOperatorP10: 0.10,
	v3.AggregateOperatorP20: 0.20,
	v3.AggregateOperatorP25: 0.25,
	v3.AggregateOperatorP50: 0.50,
	v3.AggregateOperatorP75: 0.75,
	v3.AggregateOperatorP90: 0.90,
	v3.AggregateOperatorP95: 0.95,
	v3.AggregateOperatorP99: 0.99,
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

var logOperators = map[v3.FilterOperator]string{
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
	v3.FilterOperatorRegex:           "REGEXP",
	v3.FilterOperatorNotRegex:        "NOT REGEXP",
	v3.FilterOperatorIn:              "IN",
	v3.FilterOperatorNotIn:           "NOT IN",
	v3.FilterOperatorExists:          "has(%s_%s_key, '%s')",
	v3.FilterOperatorNotExists:       "not has(%s_%s_key, '%s')",
	// (todo) check contains/not contains/
}

func enrichFieldWithMetadata(field v3.AttributeKey, fields map[string]v3.AttributeKey) v3.AttributeKey {
	if field.Type == "" || field.DataType == "" {
		// check if the field is present in the fields map
		if existingField, ok := fields[field.Key]; ok {
			if existingField.IsColumn {
				return field
			}
			field.Type = existingField.Type
			field.DataType = existingField.DataType
		} else {
			// enrich with default values if metadata is not found
			field.Type = v3.AttributeKeyTypeTag
			field.DataType = v3.AttributeKeyDataTypeString
		}
	}
	return field
}

func getClickhouseLogsColumnType(columnType v3.AttributeKeyType) string {
	if columnType == v3.AttributeKeyTypeTag {
		return "attributes"
	}
	return "resources"
}

func getClickhouseLogsColumnDataType(columnDataType v3.AttributeKeyDataType) string {
	if columnDataType == v3.AttributeKeyDataTypeFloat64 {
		return "float64"
	}
	if columnDataType == v3.AttributeKeyDataTypeInt64 {
		return "int64"
	}
	// for bool also we are returning string as we store bool data as string.
	return "string"
}

// getClickhouseColumnName returns the corresponding clickhouse column name for the given attribute/resource key
func getClickhouseColumnName(key v3.AttributeKey, fields map[string]v3.AttributeKey) (string, error) {
	clickhouseColumn := key.Key
	//if the key is present in the topLevelColumn then it will be only searched in those columns,
	//regardless if it is indexed/present again in resource or column attribute
	_, isTopLevelCol := constants.LogsTopLevelColumnsV3[key.Key]
	if !isTopLevelCol && !key.IsColumn {
		columnType := getClickhouseLogsColumnType(key.Type)
		columnDataType := getClickhouseLogsColumnDataType(key.DataType)
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
			enrichedTag := enrichFieldWithMetadata(tag, fields)
			columnName, err := getClickhouseColumnName(enrichedTag, fields)
			if err != nil {
				return "", err
			}
			selectLabels += fmt.Sprintf(", %s as %s", columnName, tag.Key)
		}
	}
	return selectLabels, nil
}

func buildLogsTimeSeriesFilterQuery(fs *v3.FilterSet, groupBy []v3.AttributeKey, fields map[string]v3.AttributeKey) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
			key := enrichFieldWithMetadata(item.Key, fields)
			value, err := utils.ValidateAndCastValue(item.Value, key.DataType)
			if err != nil {
				return "", fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
			}
			if logsOp, ok := logOperators[op]; ok {
				switch op {
				case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
					columnType := getClickhouseLogsColumnType(key.Type)
					columnDataType := getClickhouseLogsColumnDataType(key.DataType)
					conditions = append(conditions, fmt.Sprintf(logsOp, columnType, columnDataType, key.Key))
				case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
					columnName, err := getClickhouseColumnName(key, fields)
					if err != nil {
						return "", err
					}
					conditions = append(conditions, fmt.Sprintf("%s %s '%%%s%%'", columnName, logsOp, item.Value))
				default:
					columnName, err := getClickhouseColumnName(key, fields)
					if err != nil {
						return "", err
					}

					fmtVal := utils.ClickHouseFormattedValue(value)
					conditions = append(conditions, fmt.Sprintf("%s %s %s", columnName, logsOp, fmtVal))
				}
			} else {
				return "", fmt.Errorf("unsupported operator: %s", op)
			}
		}
	}

	// add group by conditions to filter out log lines which doesn't have the key
	for _, attr := range groupBy {
		enrichedAttr := enrichFieldWithMetadata(attr, fields)
		if !enrichedAttr.IsColumn {
			columnType := getClickhouseLogsColumnType(enrichedAttr.Type)
			columnDataType := getClickhouseLogsColumnDataType(enrichedAttr.DataType)
			conditions = append(conditions, fmt.Sprintf("indexOf(%s_%s_key, '%s') > 0", columnType, columnDataType, enrichedAttr.Key))
		}
	}

	queryString := strings.Join(conditions, " AND ")

	if len(queryString) > 0 {
		queryString = " AND " + queryString
	}
	return queryString, nil
}

// getZerosForEpochNano returns the number of zeros to be appended to the epoch time for converting it to nanoseconds
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

	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, mq.GroupBy, fields)
	if err != nil {
		return "", err
	}

	// timerange will be sent in epoch millisecond
	timeFilter := fmt.Sprintf("(timestamp >= %d AND timestamp <= %d)", start*getZerosForEpochNano(start), end*getZerosForEpochNano(end))

	selectLabels, err := getSelectLabels(mq.AggregateOperator, mq.GroupBy, fields)
	if err != nil {
		return "", err
	}

	having := having(mq.Having)
	if having != "" {
		having = " having " + having
	}

	queryTmpl :=
		"SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL %d SECOND) AS ts" + selectLabels +
			", %s as value " +
			"from signoz_logs.distributed_logs " +
			"where " + timeFilter + "%s " +
			"group by %s%s " +
			"order by %sts"

	groupBy := groupByAttributeKeyTags(mq.GroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)

	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		enrichedAttribute := enrichFieldWithMetadata(mq.AggregateAttribute, fields)
		aggregationKey, err = getClickhouseColumnName(enrichedAttribute, fields)
		if err != nil {
			return "", err
		}
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRate:
		op := fmt.Sprintf("count(%s)/%d", aggregationKey, step)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin:
		op := fmt.Sprintf("%s(%s)/%d", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey, step)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, having, orderBy)
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
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(%s)", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCount:
		if mq.AggregateAttribute.Key != "" {
			field := enrichFieldWithMetadata(mq.AggregateAttribute, fields)
			columnType := getClickhouseLogsColumnType(field.Type)
			columnDataType := getClickhouseLogsColumnDataType(field.DataType)
			filterSubQuery = fmt.Sprintf("%s AND has(%s_%s_key, '%s')", filterSubQuery, columnType, columnDataType, mq.AggregateAttribute.Key)
		}

		op := "toFloat64(count(*))"
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, having, orderBy)
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
		having = append(having, fmt.Sprintf("value %s %s", item.Operator, utils.ClickHouseFormattedValue(item.Value)))
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
	if limit == 0 {
		limit = 100
	}
	if panelType == v3.PanelTypeList {
		return fmt.Sprintf("%s LIMIT %d", query, limit)
	}
	return query
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
