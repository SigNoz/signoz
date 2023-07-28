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
func getClickhouseColumnName(key v3.AttributeKey) string {
	clickhouseColumn := key.Key
	if key.Key == constants.TIMESTAMP || key.Key == "id" {
		return key.Key
	}

	//if the key is present in the topLevelColumn then it will be only searched in those columns,
	//regardless if it is indexed/present again in resource or column attribute
	if !key.IsColumn {
		columnType := getClickhouseLogsColumnType(key.Type)
		columnDataType := getClickhouseLogsColumnDataType(key.DataType)
		clickhouseColumn = fmt.Sprintf("%s_%s_value[indexOf(%s_%s_key, '%s')]", columnType, columnDataType, columnType, columnDataType, key.Key)
	}
	return clickhouseColumn
}

// getSelectLabels returns the select labels for the query based on groupBy and aggregateOperator
func getSelectLabels(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey) string {
	var selectLabels string
	if aggregatorOperator == v3.AggregateOperatorNoOp {
		selectLabels = ""
	} else {
		for _, tag := range groupBy {
			columnName := getClickhouseColumnName(tag)
			selectLabels += fmt.Sprintf(" %s as %s,", columnName, tag.Key)
		}
	}
	return selectLabels
}

func getSelectKeys(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey) string {
	var selectLabels []string
	if aggregatorOperator == v3.AggregateOperatorNoOp {
		return ""
	} else {
		for _, tag := range groupBy {
			selectLabels = append(selectLabels, tag.Key)
		}
	}
	return strings.Join(selectLabels, ",")
}

func buildLogsTimeSeriesFilterQuery(fs *v3.FilterSet, groupBy []v3.AttributeKey) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
			value, err := utils.ValidateAndCastValue(item.Value, item.Key.DataType)
			if err != nil {
				return "", fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
			}
			if logsOp, ok := logOperators[op]; ok {
				switch op {
				case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
					columnType := getClickhouseLogsColumnType(item.Key.Type)
					columnDataType := getClickhouseLogsColumnDataType(item.Key.DataType)
					conditions = append(conditions, fmt.Sprintf(logsOp, columnType, columnDataType, item.Key.Key))
				case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
					columnName := getClickhouseColumnName(item.Key)
					conditions = append(conditions, fmt.Sprintf("%s %s '%%%s%%'", columnName, logsOp, item.Value))
				default:
					columnName := getClickhouseColumnName(item.Key)
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
		if !attr.IsColumn {
			columnType := getClickhouseLogsColumnType(attr.Type)
			columnDataType := getClickhouseLogsColumnDataType(attr.DataType)
			conditions = append(conditions, fmt.Sprintf("indexOf(%s_%s_key, '%s') > 0", columnType, columnDataType, attr.Key))
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

func buildLogsQuery(panelType v3.PanelType, start, end, step int64, mq *v3.BuilderQuery, graphLimitQtype string) (string, error) {

	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, mq.GroupBy)
	if err != nil {
		return "", err
	}

	// timerange will be sent in epoch millisecond
	timeFilter := fmt.Sprintf("(timestamp >= %d AND timestamp <= %d)", start*getZerosForEpochNano(start), end*getZerosForEpochNano(end))

	selectLabels := getSelectLabels(mq.AggregateOperator, mq.GroupBy)

	having := having(mq.Having)
	if having != "" {
		having = " having " + having
	}

	var queryTmpl string
	if graphLimitQtype == constants.FirstQueryGraphLimit {
		queryTmpl = "SELECT"
	} else if panelType == v3.PanelTypeTable {
		queryTmpl =
			"SELECT now() as ts,"
	} else if panelType == v3.PanelTypeGraph || panelType == v3.PanelTypeValue {
		// Select the aggregate value for interval
		queryTmpl =
			fmt.Sprintf("SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL %d SECOND) AS ts,", step)
	}

	queryTmpl =
		queryTmpl + selectLabels +
			" %s as value " +
			"from signoz_logs.distributed_logs " +
			"where " + timeFilter + "%s" +
			"%s%s" +
			"%s"

	// we dont need value for first query
	// going with this route as for a cleaner approach on implementation
	if graphLimitQtype == constants.FirstQueryGraphLimit {
		queryTmpl = "SELECT " + getSelectKeys(mq.AggregateOperator, mq.GroupBy) + " from (" + queryTmpl + ")"
	}

	groupBy := groupByAttributeKeyTags(panelType, graphLimitQtype, mq.GroupBy...)
	if panelType != v3.PanelTypeList && groupBy != "" {
		groupBy = " group by " + groupBy
	}
	orderBy := orderByAttributeKeyTags(panelType, mq.OrderBy, mq.GroupBy)
	if panelType != v3.PanelTypeList && orderBy != "" {
		orderBy = " order by " + orderBy
	}

	if graphLimitQtype == constants.SecondQueryGraphLimit {
		filterSubQuery = filterSubQuery + " AND " + fmt.Sprintf("(%s) GLOBAL IN (", getSelectKeys(mq.AggregateOperator, mq.GroupBy)) + "%s)"
	}

	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		aggregationKey = getClickhouseColumnName(mq.AggregateAttribute)
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRate:
		op := fmt.Sprintf("count(%s)/%d", aggregationKey, step)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin:
		op := fmt.Sprintf("%s(%s)/%d", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey, step)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
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
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(%s)", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCount:
		if mq.AggregateAttribute.Key != "" {
			columnType := getClickhouseLogsColumnType(mq.AggregateAttribute.Type)
			columnDataType := getClickhouseLogsColumnDataType(mq.AggregateAttribute.DataType)
			filterSubQuery = fmt.Sprintf("%s AND has(%s_%s_key, '%s')", filterSubQuery, columnType, columnDataType, mq.AggregateAttribute.Key)
		}

		op := "toFloat64(count(*))"
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorNoOp:
		queryTmpl := constants.LogsSQLSelect + "from signoz_logs.distributed_logs where %s%s order by %s"
		query := fmt.Sprintf(queryTmpl, timeFilter, filterSubQuery, orderBy)
		return query, nil
	default:
		return "", fmt.Errorf("unsupported aggregate operator")
	}
}

func buildLogsLiveTailQuery(mq *v3.BuilderQuery) (string, error) {
	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, mq.GroupBy)
	if err != nil {
		return "", err
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorNoOp:
		queryTmpl := constants.LogsSQLSelect + "from signoz_logs.distributed_logs where %s"
		if len(filterSubQuery) == 0 {
			filterSubQuery = "%s"
		} else {
			filterSubQuery = "%s " + filterSubQuery
		}
		query := fmt.Sprintf(queryTmpl, filterSubQuery)
		return query, nil
	default:
		return "", fmt.Errorf("unsupported aggregate operator in live tail")
	}
}

// groupBy returns a string of comma separated tags for group by clause
// `ts` is always added to the group by clause
func groupBy(panelType v3.PanelType, graphLimitQtype string, tags ...string) string {
	if (graphLimitQtype != constants.FirstQueryGraphLimit) && (panelType == v3.PanelTypeGraph || panelType == v3.PanelTypeValue) {
		tags = append(tags, "ts")
	}
	return strings.Join(tags, ",")
}

func groupByAttributeKeyTags(panelType v3.PanelType, graphLimitQtype string, tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, tag.Key)
	}
	return groupBy(panelType, graphLimitQtype, groupTags...)
}

// orderBy returns a string of comma separated tags for order by clause
// if there are remaining items which are not present in tags they are also added
// if the order is not specified, it defaults to ASC
func orderBy(panelType v3.PanelType, items []v3.OrderBy, tagLookup map[string]struct{}) []string {
	var orderBy []string

	for _, item := range items {
		if item.ColumnName == constants.SigNozOrderByValue {
			orderBy = append(orderBy, fmt.Sprintf("value %s", item.Order))
		} else if _, ok := tagLookup[item.ColumnName]; ok {
			orderBy = append(orderBy, fmt.Sprintf("%s %s", item.ColumnName, item.Order))
		} else if panelType == v3.PanelTypeList {
			attr := v3.AttributeKey{Key: item.ColumnName, DataType: item.DataType, Type: item.Type, IsColumn: item.IsColumn}
			name := getClickhouseColumnName(attr)
			orderBy = append(orderBy, fmt.Sprintf("%s %s", name, item.Order))
		}
	}
	return orderBy
}

func orderByAttributeKeyTags(panelType v3.PanelType, items []v3.OrderBy, tags []v3.AttributeKey) string {

	tagLookup := map[string]struct{}{}
	for _, v := range tags {
		tagLookup[v.Key] = struct{}{}
	}

	orderByArray := orderBy(panelType, items, tagLookup)

	if len(orderByArray) == 0 {
		if panelType == v3.PanelTypeList {
			orderByArray = append(orderByArray, constants.TIMESTAMP+" DESC")
		} else {
			orderByArray = append(orderByArray, "value DESC")
		}
	}

	str := strings.Join(orderByArray, ",")
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

func addLimitToQuery(query string, limit uint64) string {
	if limit == 0 {
		return query
	}
	return fmt.Sprintf("%s LIMIT %d", query, limit)
}

func addOffsetToQuery(query string, offset uint64) string {
	return fmt.Sprintf("%s OFFSET %d", query, offset)
}

type Options struct {
	GraphLimitQtype string
	IsLivetailQuery bool
}

func PrepareLogsQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, options Options) (string, error) {
	if options.IsLivetailQuery {
		query, err := buildLogsLiveTailQuery(mq)
		if err != nil {
			return "", err
		}
		return query, nil
	} else if options.GraphLimitQtype == constants.FirstQueryGraphLimit {
		// give me just the groupby names
		query, err := buildLogsQuery(panelType, start, end, mq.StepInterval, mq, options.GraphLimitQtype)
		if err != nil {
			return "", err
		}
		query = addLimitToQuery(query, mq.Limit)

		return query, nil
	} else if options.GraphLimitQtype == constants.SecondQueryGraphLimit {
		query, err := buildLogsQuery(panelType, start, end, mq.StepInterval, mq, options.GraphLimitQtype)
		if err != nil {
			return "", err
		}
		return query, nil
	}

	query, err := buildLogsQuery(panelType, start, end, mq.StepInterval, mq, options.GraphLimitQtype)
	if err != nil {
		return "", err
	}
	if panelType == v3.PanelTypeValue {
		query, err = reduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}

	if panelType == v3.PanelTypeList {
		if mq.PageSize > 0 {
			if mq.Limit > 0 && mq.Offset > mq.Limit {
				return "", fmt.Errorf("max limit exceeded")
			}
			query = addLimitToQuery(query, mq.PageSize)
			query = addOffsetToQuery(query, mq.Offset)
		} else {
			query = addLimitToQuery(query, mq.Limit)
		}
	} else if panelType == v3.PanelTypeTable {
		query = addLimitToQuery(query, mq.Limit)
	}

	return query, err
}
