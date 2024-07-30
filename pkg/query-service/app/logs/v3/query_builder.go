package v3

import (
	"fmt"
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
	v3.FilterOperatorLike:            "LIKE",
	v3.FilterOperatorNotLike:         "NOT LIKE",
	v3.FilterOperatorContains:        "LIKE",
	v3.FilterOperatorNotContains:     "NOT LIKE",
	v3.FilterOperatorRegex:           "match(%s, %s)",
	v3.FilterOperatorNotRegex:        "NOT match(%s, %s)",
	v3.FilterOperatorIn:              "IN",
	v3.FilterOperatorNotIn:           "NOT IN",
	v3.FilterOperatorExists:          "mapContains(%s_%s, '%s')",
	v3.FilterOperatorNotExists:       "not mapContains(%s_%s, '%s')",
}

const (
	BODY                                = "body"
	DISTRIBUTED_LOGS_V2                 = "distributed_logs_v2"
	DISTRIBUTED_LOGS_V2_RESOURCE_BUCKET = "distributed_logs_v2_resource_bucket"
)

func getClickhouseLogsColumnType(columnType v3.AttributeKeyType) string {
	if columnType == v3.AttributeKeyTypeTag {
		return "attributes"
	}
	return "resources"
}

func getClickhouseLogsColumnDataType(columnDataType v3.AttributeKeyDataType) string {
	if columnDataType == v3.AttributeKeyDataTypeFloat64 || columnDataType == v3.AttributeKeyDataTypeInt64 {
		return "number"
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
		columnType := getClickhouseLogsColumnType(key.Type)
		columnDataType := getClickhouseLogsColumnDataType(key.DataType)
		clickhouseColumn = fmt.Sprintf("%s_%s['%s']", columnType, columnDataType, key.Key)
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

func getSelectKeys(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey) string {
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
	columnType := getClickhouseLogsColumnType(item.Key.Type)
	columnDataType := getClickhouseLogsColumnDataType(item.Key.DataType)
	return fmt.Sprintf(logOperators[op], columnType, columnDataType, item.Key.Key)
}

func buildLogsTimeSeriesFilterQuery(fs *v3.FilterSet, groupBy []v3.AttributeKey, aggregateAttribute v3.AttributeKey) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {

			// skip if it's a resource attribute
			if item.Key.Type == v3.AttributeKeyTypeResource {
				continue
			}

			if item.Key.IsJSON {
				filter, err := GetJSONFilter(item)
				if err != nil {
					return "", err
				}
				conditions = append(conditions, filter)
				continue
			}

			// check if the user is searching for all attributes
			if item.Key.Key == "__attrs" {
				if (item.Operator != v3.FilterOperatorEqual && item.Operator != v3.FilterOperatorContains) || item.Key.DataType != v3.AttributeKeyDataTypeString {
					return "", fmt.Errorf("only = operator and string data type is supported for __attrs")
				}
				val := utils.QuoteEscapedString(fmt.Sprintf("%v", item.Value))
				conditions = append(conditions, fmt.Sprintf("has(mapValues(attributes_string), '%v')", val))
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
		// skip if it's a resource attribute
		if attr.Type == v3.AttributeKeyTypeResource {
			continue
		}

		if !attr.IsColumn {
			columnType := getClickhouseLogsColumnType(attr.Type)
			columnDataType := getClickhouseLogsColumnDataType(attr.DataType)
			conditions = append(conditions, fmt.Sprintf("mapContains(%s_%s, '%s')", columnType, columnDataType, attr.Key))
		} else if attr.Type != v3.AttributeKeyTypeUnspecified {
			// for materialzied columns
			conditions = append(conditions, fmt.Sprintf("%s_exists`=true", strings.TrimSuffix(getClickhouseColumnName(attr), "`")))
		}
	}

	// add conditions for aggregate attribute
	if aggregateAttribute.Key != "" && aggregateAttribute.Type != v3.AttributeKeyTypeResource {
		existsFilter := GetExistsNexistsFilter(v3.FilterOperatorExists, v3.FilterItem{Key: aggregateAttribute})
		conditions = append(conditions, existsFilter)
	}

	queryString := strings.Join(conditions, " AND ")
	return queryString, nil
}

func buildResourceBucketFilters(fs *v3.FilterSet, groupBy []v3.AttributeKey, orderBy []v3.OrderBy, aggregateAttribute v3.AttributeKey) (string, error) {
	var andConditions []string
	var orConditions []string
	// only add the resource attributes to the filters here
	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			// skip anything other than resource attribute
			if item.Key.Type != v3.AttributeKeyTypeResource {
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

			columnName := fmt.Sprintf("simpleJSONExtractString(lower(labels), '%s')", item.Key.Key)

			if logsOp, ok := logOperators[op]; ok {
				switch op {
				case v3.FilterOperatorExists:
					andConditions = append(andConditions, fmt.Sprintf("simpleJSONHas(labels, '%s')", item.Key.Key))
				case v3.FilterOperatorNotExists:
					andConditions = append(andConditions, fmt.Sprintf("not simpleJSONHas(labels, '%s')", item.Key.Key))
				case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex:
					fmtVal := utils.ClickHouseFormattedValue(value)
					// for regex don't lowercase it as it will result in something else
					andConditions = append(andConditions, fmt.Sprintf(logsOp, columnName, fmtVal))
				case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
					val := utils.QuoteEscapedString(fmt.Sprintf("%v", item.Value))
					andConditions = append(andConditions, fmt.Sprintf("%s %s '%%%s%%'", columnName, logsOp, strings.ToLower(val)))
				default:
					fmtVal := utils.ClickHouseFormattedValue(value)
					andConditions = append(andConditions, fmt.Sprintf("%s %s %s", columnName, logsOp, strings.ToLower(fmtVal)))
				}

				// add index filters
				switch op {
				case v3.FilterOperatorContains, v3.FilterOperatorEqual, v3.FilterOperatorLike:
					val := utils.QuoteEscapedString(fmt.Sprintf("%v", item.Value))
					andConditions = append(andConditions, fmt.Sprintf("lower(labels) like '%%%s%%%s%%'", strings.ToLower(item.Key.Key), strings.ToLower(val)))
				case v3.FilterOperatorNotContains, v3.FilterOperatorNotEqual, v3.FilterOperatorNotLike:
					val := utils.QuoteEscapedString(fmt.Sprintf("%v", item.Value))
					andConditions = append(andConditions, fmt.Sprintf("lower(labels) not like '%%%s%%%s%%'", strings.ToLower(item.Key.Key), strings.ToLower(val)))
				case v3.FilterOperatorNotRegex:
					andConditions = append(andConditions, fmt.Sprintf("lower(labels) not like '%%%s%%'", strings.ToLower(item.Key.Key)))
				case v3.FilterOperatorIn, v3.FilterOperatorNotIn:

					// for in operator value needs to used for indexing in a different way.
					// eg1:= x in a,b,c = (labels like '%x%a%' or labels like '%"x":"b"%' or labels like '%"x"="c"%')
					// eg1:= x nin a,b,c = (labels nlike '%x%a%' AND labels nlike '%"x"="b"' AND labels nlike '%"x"="c"%')
					tCondition := []string{}

					separator := " OR "
					sqlOp := "like"
					if op == v3.FilterOperatorNotIn {
						separator = " AND "
						sqlOp = "not like"
					}

					values := []string{}

					switch item.Value.(type) {
					case string:
						values = append(values, item.Value.(string))
					case []interface{}:
						for _, v := range (item.Value).([]interface{}) {
							// also resources attributes are always string values
							strV, ok := v.(string)
							if !ok {
								continue
							}
							values = append(values, strV)
						}
					}

					if len(values) > 0 {
						for _, v := range values {
							tCondition = append(tCondition, fmt.Sprintf("lower(labels) %s '%%\"%s\":\"%s\"%%'", sqlOp, strings.ToLower(item.Key.Key), strings.ToLower(v)))
						}
						andConditions = append(andConditions, "("+strings.Join(tCondition, separator)+")")
					}

				default:
					andConditions = append(andConditions, fmt.Sprintf("lower(labels) like '%%%s%%'", strings.ToLower(item.Key.Key)))
				}

			} else {
				return "", fmt.Errorf("unsupported operator: %s", op)
			}

		}
	}

	// for group by add exists check in resources
	if aggregateAttribute.Key != "" && aggregateAttribute.Type == v3.AttributeKeyTypeResource {
		andConditions = append(andConditions, fmt.Sprintf("(simpleJSONHas(labels, '%s') AND lower(labels) like '%%%s%%')", aggregateAttribute.Key, strings.ToLower(aggregateAttribute.Key)))
	}

	// for aggregate attribute add exists check in resources
	// we are using OR for groupBy and orderby as we just want to filter out the logs using fingerprint
	for _, attr := range groupBy {
		if attr.Type != v3.AttributeKeyTypeResource {
			continue
		}
		orConditions = append(orConditions, fmt.Sprintf("(simpleJSONHas(labels, '%s') AND lower(labels) like '%%%s%%')", attr.Key, strings.ToLower(attr.Key)))
	}

	// for orderBy it's not required as the keys will be already present in the group by
	// so no point in adding them

	if len(orConditions) > 0 {
		// TODO: change OR to AND once we know how to solve for group by
		orConditionStr := "( " + strings.Join(orConditions, " AND ") + " )"
		andConditions = append(andConditions, orConditionStr)
	}

	if len(andConditions) == 0 {
		return "", nil
	}

	conditionStr := strings.Join(andConditions, " AND ")
	return conditionStr, nil
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
	logsStart := utils.GetEpochNanoSecs(start)
	logsEnd := utils.GetEpochNanoSecs(end)

	// -1800 this is added so that the bucket start considers all the fingerprints.
	bucketStart := logsStart/1000000000 - 1800
	bucketEnd := logsEnd / 1000000000

	timeFilter := fmt.Sprintf("(timestamp >= %d AND timestamp <= %d)", logsStart, logsEnd)

	resourceBucketFilters, err := buildResourceBucketFilters(mq.Filters, mq.GroupBy, mq.OrderBy, mq.AggregateAttribute)
	if err != nil {
		return "", err
	}

	tableName := "distributed_logs"

	// panel type filter is not added because user can choose table type and get the default count
	if len(filterSubQuery) > 0 || len(mq.GroupBy) > 0 || len(resourceBucketFilters) > 0 {
		tableName = DISTRIBUTED_LOGS_V2

		timeFilter = timeFilter + fmt.Sprintf(" AND (ts_bucket_start >= %d AND ts_bucket_start <= %d)", bucketStart, bucketEnd)
	}

	if len(resourceBucketFilters) > 0 {
		filter := " AND (resource_fingerprint GLOBAL IN (" +
			"SELECT fingerprint FROM signoz_logs.%s " +
			"WHERE (seen_at_ts_bucket_start >= %d) AND (seen_at_ts_bucket_start <= %d) AND "
		filter = fmt.Sprintf(filter, DISTRIBUTED_LOGS_V2_RESOURCE_BUCKET, bucketStart, bucketEnd)

		filterSubQuery = filterSubQuery + filter + resourceBucketFilters + "))"
	}

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
			"from signoz_logs." + tableName +
			" where " + timeFilter + "%s" +
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
		filterSubQuery = filterSubQuery + " AND " + fmt.Sprintf("(%s) GLOBAL IN (", getSelectKeys(mq.AggregateOperator, mq.GroupBy)) + "#LIMIT_PLACEHOLDER)"
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

		op := fmt.Sprintf("%s(%s)/%f", aggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey, rate)
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
		op := "toFloat64(count(*))"
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorNoOp:
		sqlSelect := constants.LogsSQLSelect
		// with noop any filter or different order by other than ts will use new table
		if len(filterSubQuery) > 0 || !isOrderByTs(mq.OrderBy) {
			sqlSelect = constants.LogsSQLSelectV2
			tableName = DISTRIBUTED_LOGS_V2
		}
		queryTmpl := sqlSelect + "from signoz_logs.%s where %s%s order by %s"
		query := fmt.Sprintf(queryTmpl, tableName, timeFilter, filterSubQuery, orderBy)
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
		if len(filterSubQuery) > 0 {
			query := constants.LogsSQLSelectV2 + "from signoz_logs.distributed_logs where "
			query += filterSubQuery + " AND "
			return query, nil
		}

		query := constants.LogsSQLSelect + "from signoz_logs.distributed_logs where "
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
			if item.IsColumn {
				name = "`" + name + "`"
			}
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
	PreferRPM       bool
}

func isOrderByTs(orderBy []v3.OrderBy) bool {
	if len(orderBy) == 1 && (orderBy[0].Key == constants.TIMESTAMP || orderBy[0].ColumnName == constants.TIMESTAMP) {
		return true
	}
	return false
}

// PrepareLogsQuery prepares the query for logs
// start and end are in epoch millisecond
// step is in seconds
func PrepareLogsQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, options Options) (string, error) {

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
		query = addLimitToQuery(query, mq.Limit)

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
		query, err = reduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}

	if panelType == v3.PanelTypeList {
		// check if limit exceeded
		if mq.Limit > 0 && mq.Offset >= mq.Limit {
			return "", fmt.Errorf("max limit exceeded")
		}

		if mq.PageSize > 0 {
			if mq.Limit > 0 && mq.Offset+mq.PageSize > mq.Limit {
				query = addLimitToQuery(query, mq.Limit-mq.Offset)
			} else {
				query = addLimitToQuery(query, mq.PageSize)
			}

			// add offset to the query only if it is not orderd by timestamp.
			if !isOrderByTs(mq.OrderBy) {
				query = addOffsetToQuery(query, mq.Offset)
			}

		} else {
			query = addLimitToQuery(query, mq.Limit)
		}
	} else if panelType == v3.PanelTypeTable {
		query = addLimitToQuery(query, mq.Limit)
	}

	return query, err
}
