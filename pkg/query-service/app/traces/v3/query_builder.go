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
	v3.FilterOperatorExists:          "has(%s%s, '%s')",
	v3.FilterOperatorNotExists:       "NOT has(%s%s, '%s')",
}

func getColumnName(key v3.AttributeKey, keys map[string]v3.AttributeKey) string {
	key = enrichKeyWithMetadata(key, keys)
	if key.IsColumn {
		return key.Key
	}
	filterType, filterDataType := getClickhouseTracesColumnDataTypeAndType(key)
	return fmt.Sprintf("%s%s['%s']", filterDataType, filterType, key.Key)
}

func getClickhouseTracesColumnDataTypeAndType(key v3.AttributeKey) (v3.AttributeKeyType, string) {
	filterType := key.Type
	filterDataType := "string"
	if key.DataType == v3.AttributeKeyDataTypeFloat64 || key.DataType == v3.AttributeKeyDataTypeInt64 {
		filterDataType = "number"
	} else if key.DataType == v3.AttributeKeyDataTypeBool {
		filterDataType = "bool"
	}
	if filterType == v3.AttributeKeyTypeTag {
		filterType = "TagMap"
	} else {
		filterType = "resourceTagsMap"
		filterDataType = ""
	}
	return filterType, filterDataType
}

func enrichKeyWithMetadata(key v3.AttributeKey, keys map[string]v3.AttributeKey) v3.AttributeKey {
	if key.Type == "" || key.DataType == "" {
		// check if the key is present in the keys map
		if existingKey, ok := keys[key.Key]; ok {
			key.IsColumn = existingKey.IsColumn
			key.Type = existingKey.Type
			key.DataType = existingKey.DataType
		} else { // if not present then set the default values
			key.Type = v3.AttributeKeyTypeTag
			key.DataType = v3.AttributeKeyDataTypeString
			key.IsColumn = false
			return key
		}
	}
	return key
}

// getSelectLabels returns the select labels for the query based on groupBy and aggregateOperator
func getSelectLabels(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey, keys map[string]v3.AttributeKey) (string, error) {
	var selectLabels string
	if aggregatorOperator == v3.AggregateOperatorNoOp {
		selectLabels = ""
	} else {
		for _, tag := range groupBy {
			filterName := getColumnName(tag, keys)
			selectLabels += fmt.Sprintf(", %s as `%s`", filterName, tag.Key)
		}
	}
	return selectLabels, nil
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

func buildTracesFilterQuery(fs *v3.FilterSet, keys map[string]v3.AttributeKey) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			val := item.Value
			// generate the key
			columnName := getColumnName(item.Key, keys)
			var fmtVal string
			key := enrichKeyWithMetadata(item.Key, keys)
			if item.Operator != v3.FilterOperatorExists && item.Operator != v3.FilterOperatorNotExists {
				var err error
				val, err = utils.ValidateAndCastValue(val, key.DataType)
				if err != nil {
					return "", fmt.Errorf("invalid value for key %s: %v", item.Key.Key, err)
				}
			}
			fmtVal = utils.ClickHouseFormattedValue(val)
			if operator, ok := tracesOperatorMappingV3[item.Operator]; ok {
				switch item.Operator {
				case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
					conditions = append(conditions, fmt.Sprintf("%s %s '%%%s%%'", columnName, operator, item.Value))

				case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
					if key.IsColumn {
						subQuery, err := existsSubQueryForFixedColumn(key, item.Operator)
						if err != nil {
							return "", err
						}
						conditions = append(conditions, subQuery)
					} else {
						columnType, columnDataType := getClickhouseTracesColumnDataTypeAndType(key)
						conditions = append(conditions, fmt.Sprintf(operator, columnDataType, columnType, key.Key))
					}

				default:
					conditions = append(conditions, fmt.Sprintf("%s %s %s", columnName, operator, fmtVal))
				}
			} else {
				return "", fmt.Errorf("unsupported operator %s", item.Operator)
			}
		}
	}
	queryString := strings.Join(conditions, " AND ")

	if len(queryString) > 0 {
		queryString = " AND " + queryString
	}
	return queryString, nil
}

func existsSubQueryForFixedColumn(key v3.AttributeKey, op v3.FilterOperator) (string, error) {
	if key.DataType == v3.AttributeKeyDataTypeString {
		if op == v3.FilterOperatorExists {
			return fmt.Sprintf("%s %s ''", key.Key, tracesOperatorMappingV3[v3.FilterOperatorNotEqual]), nil
		} else {
			return fmt.Sprintf("%s %s ''", key.Key, tracesOperatorMappingV3[v3.FilterOperatorEqual]), nil
		}
	} else {
		return "", fmt.Errorf("unsupported operation, exists and not exists can only be applied on custom attributes or string type columns")
	}
}

func handleEmptyValuesInGroupBy(keys map[string]v3.AttributeKey, groupBy []v3.AttributeKey) (string, error) {
	filterItems := []v3.FilterItem{}
	if len(groupBy) != 0 {
		for _, item := range groupBy {
			key := enrichKeyWithMetadata(item, keys)
			if !key.IsColumn {
				filterItems = append(filterItems, v3.FilterItem{
					Key:      item,
					Operator: v3.FilterOperatorExists,
				})
			}
		}
	}
	if len(filterItems) != 0 {
		filterSet := v3.FilterSet{
			Operator: "AND",
			Items:    filterItems,
		}
		return buildTracesFilterQuery(&filterSet, keys)
	}
	return "", nil
}

func buildTracesQuery(start, end, step int64, mq *v3.BuilderQuery, tableName string, keys map[string]v3.AttributeKey) (string, error) {

	filterSubQuery, err := buildTracesFilterQuery(mq.Filters, keys)
	if err != nil {
		return "", err
	}
	// timerange will be sent in epoch millisecond
	spanIndexTableTimeFilter := fmt.Sprintf("(timestamp >= '%d' AND timestamp <= '%d')", start*getZerosForEpochNano(start), end*getZerosForEpochNano(end))

	selectLabels, err := getSelectLabels(mq.AggregateOperator, mq.GroupBy, keys)
	if err != nil {
		return "", err
	}

	having := having(mq.Having)
	if having != "" {
		having = " having " + having
	}

	// Select the aggregate value for interval
	queryTmpl :=
		"SELECT toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts" + selectLabels +
			", %s as value " +
			"from " + constants.SIGNOZ_TRACE_DBNAME + "." + constants.SIGNOZ_SPAN_INDEX_TABLENAME +
			" where " + spanIndexTableTimeFilter + "%s " +
			"group by %s%s " +
			"order by %sts"

	emptyValuesInGroupByFilter, err := handleEmptyValuesInGroupBy(keys, mq.GroupBy)
	if err != nil {
		return "", err
	}
	filterSubQuery += emptyValuesInGroupByFilter

	groupBy := groupByAttributeKeyTags(keys, mq.GroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)

	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		aggregationKey = getColumnName(mq.AggregateAttribute, keys)
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin,
		v3.AggregateOperatorRate:
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
			key := enrichKeyWithMetadata(mq.AggregateAttribute, keys)
			if key.IsColumn {
				subQuery, err := existsSubQueryForFixedColumn(key, v3.FilterOperatorExists)
				if err == nil {
					filterSubQuery = fmt.Sprintf("%s AND %s", filterSubQuery, subQuery)
				}
			} else {
				columnType, columnDataType := getClickhouseTracesColumnDataTypeAndType(key)
				filterSubQuery = fmt.Sprintf("%s AND has(%s%s, '%s')", filterSubQuery, columnDataType, columnType, mq.AggregateAttribute.Key)
			}
		}
		op := "toFloat64(count())"
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, step, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorNoOp:
		// queryTmpl := constants.TracesSQLSelect + "from " + constants.SIGNOZ_TRACE_DBNAME + "." + constants.SIGNOZ_SPAN_INDEX_TABLENAME + " where %s %s"
		// query := fmt.Sprintf(queryTmpl, spanIndexTableTimeFilter, filterSubQuery)
		// return query, nil
		return "", fmt.Errorf("not implemented, part of traces page")
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

func groupByAttributeKeyTags(keys map[string]v3.AttributeKey, tags ...v3.AttributeKey) string {
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

func reduceToQuery(query string, reduceTo v3.ReduceToOperator, aggregateOperator v3.AggregateOperator) (string, error) {

	var groupBy string
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

func PrepareTracesQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, keys map[string]v3.AttributeKey) (string, error) {
	query, err := buildTracesQuery(start, end, mq.StepInterval, mq, constants.SIGNOZ_SPAN_INDEX_TABLENAME, keys)
	if err != nil {
		return "", err
	}
	if panelType == v3.PanelTypeValue {
		query, err = reduceToQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}
	query = addLimitToQuery(query, mq.Limit, panelType)

	if mq.Offset != 0 {
		query = addOffsetToQuery(query, mq.Offset)
	}
	return query, err
}
