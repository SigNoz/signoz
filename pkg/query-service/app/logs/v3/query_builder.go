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
	if aggregatorOperator == v3.AggregateOperatorNoOp || aggregatorOperator == v3.AggregateOperatorRate {
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
			op := strings.ToLower(strings.TrimSpace(item.Operator))

			// generate the key
			columnName, err := getClickhouseColumnName(item.Key, fields)
			if err != nil {
				return "", err
			}
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

func buildLogsQuery(start, end, step int64, mq *v3.BuilderQuery, tableName string, fields map[string]v3.AttributeKey) (string, error) {

	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, fields)
	if err != nil {
		return "", err
	}

	samplesTableTimeFilter := fmt.Sprintf("(timestamp >= %d AND timestamp <= %d)", start, end)

	selectLabels, err := getSelectLabels(mq.AggregateOperator, mq.GroupBy, fields)
	if err != nil {
		return "", err
	}

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
		query := fmt.Sprintf(queryTmpl, samplesTableTimeFilter, filterSubQuery)
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

func addLimitToQuery(query string, limit uint64) string {
	if limit == 0 {
		limit = 100
	}
	return fmt.Sprintf("%s LIMIT %d", query, limit)
}

func addOffsetToQuery(query string, offset uint64) string {
	return fmt.Sprintf("%s OFFSET %d", query, offset)
}

func PrepareLogsQuery(start, end, step int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, fields map[string]v3.AttributeKey) (string, error) {
	query, err := buildLogsQuery(start, end, step, mq, constants.SIGNOZ_TIMESERIES_TABLENAME, fields)
	if err != nil {
		return "", err
	}
	if panelType == v3.PanelTypeValue {
		query, err = reduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}

	query = addLimitToQuery(query, mq.Limit)

	if mq.Offset != 0 {
		query = addOffsetToQuery(query, mq.Offset)
	}

	return query, err
}
