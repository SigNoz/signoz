package v3

import (
	"fmt"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var AggregateOperatorToPercentile = map[v3.AggregateOperator]float64{
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

var AggregateOperatorToSQLFunc = map[v3.AggregateOperator]string{
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
	v3.FilterOperatorRegex:           "match(%s, %s)",
	v3.FilterOperatorNotRegex:        "NOT match(%s, %s)",
	v3.FilterOperatorIn:              "IN",
	v3.FilterOperatorNotIn:           "NOT IN",
	v3.FilterOperatorExists:          "has(%s_%s_key, '%s')",
	v3.FilterOperatorNotExists:       "not has(%s_%s_key, '%s')",
}

const BODY = "body"

func GetClickhouseLogsColumnType(columnType v3.AttributeKeyType) string {
	if columnType == v3.AttributeKeyTypeTag {
		return "attributes"
	}
	if columnType == v3.AttributeKeyTypeInstrumentationScope {
		return "scope"
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
	if columnDataType == v3.AttributeKeyDataTypeBool {
		return "bool"
	}
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
		columnType := GetClickhouseLogsColumnType(key.Type)
		columnDataType := getClickhouseLogsColumnDataType(key.DataType)
		clickhouseColumn = fmt.Sprintf("%s_%s_value[indexOf(%s_%s_key, '%s')]", columnType, columnDataType, columnType, columnDataType, key.Key)
		return clickhouseColumn
	}

	// check if it is a static field
	if key.Type == v3.AttributeKeyTypeUnspecified {
		// name is the column name
		return clickhouseColumn
	}

	// materialized column created from query
	clickhouseColumn = utils.GetClickhouseColumnName(string(key.Type), string(key.DataType), key.Key)
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
			selectLabels += fmt.Sprintf(" %s as `%s`,", columnName, tag.Key)
		}
	}
	return selectLabels
}

func GetSelectKeys(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey) string {
	var selectLabels []string
	if aggregatorOperator == v3.AggregateOperatorNoOp {
		return ""
	} else {
		for _, tag := range groupBy {
			selectLabels = append(selectLabels, "`"+tag.Key+"`")
		}
	}
	return strings.Join(selectLabels, ",")
}

func GetExistsNexistsFilter(op v3.FilterOperator, item v3.FilterItem) string {
	if item.Key.Type == v3.AttributeKeyTypeUnspecified {
		top := "!="
		if op == v3.FilterOperatorNotExists {
			top = "="
		}
		if val, ok := constants.StaticFieldsLogsV3[item.Key.Key]; ok {
			// skip for timestamp and id
			if val.Key == "" {
				return ""
			}

			columnName := getClickhouseColumnName(item.Key)
			if val.DataType == v3.AttributeKeyDataTypeString {
				return fmt.Sprintf("%s %s ''", columnName, top)
			} else {
				// we just have two types, number and string
				return fmt.Sprintf("%s %s 0", columnName, top)
			}
		}

	} else if item.Key.IsColumn {
		val := true
		if op == v3.FilterOperatorNotExists {
			val = false
		}
		return fmt.Sprintf("%s_exists`=%v", strings.TrimSuffix(getClickhouseColumnName(item.Key), "`"), val)
	}
	columnType := GetClickhouseLogsColumnType(item.Key.Type)
	columnDataType := getClickhouseLogsColumnDataType(item.Key.DataType)
	return fmt.Sprintf(logOperators[op], columnType, columnDataType, item.Key.Key)
}

func buildLogsTimeSeriesFilterQuery(fs *v3.FilterSet, groupBy []v3.AttributeKey, aggregateAttribute v3.AttributeKey) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			if item.Key.IsJSON {
				filter, err := GetJSONFilter(item)
				if err != nil {
					return "", err
				}
				conditions = append(conditions, filter)
				continue
			}

			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))

			var value interface{}
			var err error
			if op != v3.FilterOperatorExists && op != v3.FilterOperatorNotExists {
				value, err = utils.ValidateAndCastValue(item.Value, item.Key.DataType)
				if err != nil {
					return "", fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
				}
			}

			if logsOp, ok := logOperators[op]; ok {
				switch op {
				case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
					conditions = append(conditions, GetExistsNexistsFilter(op, item))
				case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex:
					columnName := getClickhouseColumnName(item.Key)
					fmtVal := utils.ClickHouseFormattedValue(value)
					conditions = append(conditions, fmt.Sprintf(logsOp, columnName, fmtVal))
				case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
					columnName := getClickhouseColumnName(item.Key)
					val := utils.QuoteEscapedString(fmt.Sprintf("%v", item.Value))
					if columnName == BODY {
						logsOp = strings.Replace(logsOp, "ILIKE", "LIKE", 1) // removing i from ilike and not ilike
						conditions = append(conditions, fmt.Sprintf("lower(%s) %s lower('%%%s%%')", columnName, logsOp, val))
					} else {
						conditions = append(conditions, fmt.Sprintf("%s %s '%%%s%%'", columnName, logsOp, val))
					}
				default:
					columnName := getClickhouseColumnName(item.Key)
					fmtVal := utils.ClickHouseFormattedValue(value)

					// for use lower for like and ilike
					if op == v3.FilterOperatorLike || op == v3.FilterOperatorNotLike {
						if columnName == BODY {
							logsOp = strings.Replace(logsOp, "ILIKE", "LIKE", 1) // removing i from ilike and not ilike
							columnName = fmt.Sprintf("lower(%s)", columnName)
							fmtVal = fmt.Sprintf("lower(%s)", fmtVal)
						}
					}
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
			columnType := GetClickhouseLogsColumnType(attr.Type)
			columnDataType := getClickhouseLogsColumnDataType(attr.DataType)
			conditions = append(conditions, fmt.Sprintf("has(%s_%s_key, '%s')", columnType, columnDataType, attr.Key))
		} else if attr.Type != v3.AttributeKeyTypeUnspecified {
			// for materialzied columns
			conditions = append(conditions, fmt.Sprintf("%s_exists`=true", strings.TrimSuffix(getClickhouseColumnName(attr), "`")))
		}
	}

	// add conditions for aggregate attribute
	if aggregateAttribute.Key != "" {
		existsFilter := GetExistsNexistsFilter(v3.FilterOperatorExists, v3.FilterItem{Key: aggregateAttribute})
		conditions = append(conditions, existsFilter)
	}

	queryString := strings.Join(conditions, " AND ")
	return queryString, nil
}

func buildLogsQuery(panelType v3.PanelType, start, end, step int64, mq *v3.BuilderQuery, graphLimitQtype string, preferRPM bool) (string, error) {

	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, mq.GroupBy, mq.AggregateAttribute)
	if err != nil {
		return "", err
	}
	if len(filterSubQuery) > 0 {
		filterSubQuery = " AND " + filterSubQuery
	}

	// timerange will be sent in epoch millisecond
	timeFilter := fmt.Sprintf("(timestamp >= %d AND timestamp <= %d)", utils.GetEpochNanoSecs(start), utils.GetEpochNanoSecs(end))

	selectLabels := getSelectLabels(mq.AggregateOperator, mq.GroupBy)

	having := Having(mq.Having)
	if having != "" {
		having = " having " + having
	}

	var queryTmpl string
	if graphLimitQtype == constants.FirstQueryGraphLimit {
		queryTmpl = "SELECT"
	} else if panelType == v3.PanelTypeTable {
		queryTmpl =
			"SELECT now() as ts,"
		// step or aggregate interval is whole time period in case of table panel
		step = (utils.GetEpochNanoSecs(end) - utils.GetEpochNanoSecs(start)) / 1000000000
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
		queryTmpl = "SELECT " + GetSelectKeys(mq.AggregateOperator, mq.GroupBy) + " from (" + queryTmpl + ")"
	}

	groupBy := GroupByAttributeKeyTags(panelType, graphLimitQtype, mq.GroupBy...)
	if panelType != v3.PanelTypeList && groupBy != "" {
		groupBy = " group by " + groupBy
	}
	orderBy := orderByAttributeKeyTags(panelType, mq.OrderBy, mq.GroupBy)
	if panelType != v3.PanelTypeList && orderBy != "" {
		orderBy = " order by " + orderBy
	}

	if graphLimitQtype == constants.SecondQueryGraphLimit {
		filterSubQuery = filterSubQuery + " AND " + fmt.Sprintf("(%s) GLOBAL IN (", GetSelectKeys(mq.AggregateOperator, mq.GroupBy)) + "#LIMIT_PLACEHOLDER)"
	}

	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		aggregationKey = getClickhouseColumnName(mq.AggregateAttribute)
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRate:
		rate := float64(step)
		if preferRPM {
			rate = rate / 60.0
		}

		op := fmt.Sprintf("count(%s)/%f", aggregationKey, rate)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin:
		rate := float64(step)
		if preferRPM {
			rate = rate / 60.0
		}

		op := fmt.Sprintf("%s(%s)/%f", AggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey, rate)
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
		op := fmt.Sprintf("quantile(%v)(%s)", AggregateOperatorToPercentile[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(%s)", AggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCount:
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
	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, mq.GroupBy, v3.AttributeKey{})
	if err != nil {
		return "", err
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorNoOp:
		query := constants.LogsSQLSelect + "from signoz_logs.distributed_logs where "
		if len(filterSubQuery) > 0 {
			query = query + filterSubQuery + " AND "
		}

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

func GroupByAttributeKeyTags(panelType v3.PanelType, graphLimitQtype string, tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, "`"+tag.Key+"`")
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
			orderBy = append(orderBy, fmt.Sprintf("`%s` %s", item.ColumnName, item.Order))
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

func Having(items []v3.Having) string {
	// aggregate something and filter on that aggregate
	var having []string
	for _, item := range items {
		having = append(having, fmt.Sprintf("value %s %s", item.Operator, utils.ClickHouseFormattedValue(item.Value)))
	}
	return strings.Join(having, " AND ")
}

func ReduceQuery(query string, reduceTo v3.ReduceToOperator, aggregateOperator v3.AggregateOperator) (string, error) {
	// the timestamp picked is not relevant here since the final value used is show the single
	// chart with just the query value.
	switch reduceTo {
	case v3.ReduceToOperatorLast:
		query = fmt.Sprintf("SELECT anyLast(value) as value, now() as ts FROM (%s)", query)
	case v3.ReduceToOperatorSum:
		query = fmt.Sprintf("SELECT sum(value) as value, now() as ts FROM (%s)", query)
	case v3.ReduceToOperatorAvg:
		query = fmt.Sprintf("SELECT avg(value) as value, now() as ts FROM (%s)", query)
	case v3.ReduceToOperatorMax:
		query = fmt.Sprintf("SELECT max(value) as value, now() as ts FROM (%s)", query)
	case v3.ReduceToOperatorMin:
		query = fmt.Sprintf("SELECT min(value) as value, now() as ts FROM (%s)", query)
	default:
		return "", fmt.Errorf("unsupported reduce operator")
	}
	return query, nil
}

func AddLimitToQuery(query string, limit uint64) string {
	if limit == 0 {
		return query
	}
	return fmt.Sprintf("%s LIMIT %d", query, limit)
}

func AddOffsetToQuery(query string, offset uint64) string {
	return fmt.Sprintf("%s OFFSET %d", query, offset)
}

func IsOrderByTs(orderBy []v3.OrderBy) bool {
	if len(orderBy) == 1 && (orderBy[0].Key == constants.TIMESTAMP || orderBy[0].ColumnName == constants.TIMESTAMP) {
		return true
	}
	return false
}

// PrepareLogsQuery prepares the query for logs
// start and end are in epoch millisecond
// step is in seconds
func PrepareLogsQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, options v3.QBOptions) (string, error) {

	// adjust the start and end time to the step interval
	// NOTE: Disabling this as it's creating confusion between charts and actual data
	// if panelType != v3.PanelTypeList {
	// 	start = start - (start % (mq.StepInterval * 1000))
	// 	end = end - (end % (mq.StepInterval * 1000))
	// }

	if options.IsLivetailQuery {
		query, err := buildLogsLiveTailQuery(mq)
		if err != nil {
			return "", err
		}
		return query, nil
	} else if options.GraphLimitQtype == constants.FirstQueryGraphLimit {
		// give me just the groupby names
		query, err := buildLogsQuery(panelType, start, end, mq.StepInterval, mq, options.GraphLimitQtype, options.PreferRPM)
		if err != nil {
			return "", err
		}
		query = AddLimitToQuery(query, mq.Limit)

		return query, nil
	} else if options.GraphLimitQtype == constants.SecondQueryGraphLimit {
		query, err := buildLogsQuery(panelType, start, end, mq.StepInterval, mq, options.GraphLimitQtype, options.PreferRPM)
		if err != nil {
			return "", err
		}
		return query, nil
	}

	query, err := buildLogsQuery(panelType, start, end, mq.StepInterval, mq, options.GraphLimitQtype, options.PreferRPM)
	if err != nil {
		return "", err
	}
	if panelType == v3.PanelTypeValue {
		query, err = ReduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}

	if panelType == v3.PanelTypeList {
		// check if limit exceeded
		if mq.Limit > 0 && mq.Offset >= mq.Limit {
			return "", fmt.Errorf("max limit exceeded")
		}

		if mq.PageSize > 0 {
			if mq.Limit > 0 && mq.Offset+mq.PageSize > mq.Limit {
				query = AddLimitToQuery(query, mq.Limit-mq.Offset)
			} else {
				query = AddLimitToQuery(query, mq.PageSize)
			}

			// add offset to the query only if it is not orderd by timestamp.
			if !IsOrderByTs(mq.OrderBy) {
				query = AddOffsetToQuery(query, mq.Offset)
			}

		} else {
			query = AddLimitToQuery(query, mq.Limit)
		}
	} else if panelType == v3.PanelTypeTable {
		query = AddLimitToQuery(query, mq.Limit)
	}

	return query, err
}
