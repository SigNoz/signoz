package v4

import (
	"fmt"
	"strings"

	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	"go.signoz.io/signoz/pkg/query-service/app/resource"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

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
	v3.FilterOperatorExists:          "mapContains(%s_%s, '%s')",
	v3.FilterOperatorNotExists:       "not mapContains(%s_%s, '%s')",
}

const (
	BODY                         = "body"
	DISTRIBUTED_LOGS_V2          = "distributed_logs_v2"
	DISTRIBUTED_LOGS_V2_RESOURCE = "distributed_logs_v2_resource"
	DB_NAME                      = "signoz_logs"
	NANOSECOND                   = 1000000000
)

func getClickhouseLogsColumnDataType(columnDataType v3.AttributeKeyDataType) string {
	if columnDataType == v3.AttributeKeyDataTypeFloat64 || columnDataType == v3.AttributeKeyDataTypeInt64 {
		return "number"
	}
	if columnDataType == v3.AttributeKeyDataTypeBool {
		return "bool"
	}
	return "string"
}

func getClickhouseKey(key v3.AttributeKey) string {
	// check if it is a top level static field
	if _, ok := constants.StaticFieldsLogsV3[key.Key]; ok && key.Type == v3.AttributeKeyTypeUnspecified {
		return key.Key
	}

	//if the key is present in the topLevelColumn then it will be only searched in those columns,
	//regardless if it is indexed/present again in resource or column attribute
	if !key.IsColumn {
		columnType := logsV3.GetClickhouseLogsColumnType(key.Type)
		columnDataType := getClickhouseLogsColumnDataType(key.DataType)
		return fmt.Sprintf("%s_%s['%s']", columnType, columnDataType, key.Key)
	}

	// materialized column created from query
	// https://github.com/SigNoz/signoz/pull/4775
	return "`" + utils.GetClickhouseColumnNameV2(string(key.Type), string(key.DataType), key.Key) + "`"
}

func getSelectLabels(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey) string {
	var selectLabels string
	if aggregatorOperator == v3.AggregateOperatorNoOp {
		selectLabels = ""
	} else {
		for _, tag := range groupBy {
			columnName := getClickhouseKey(tag)
			selectLabels += fmt.Sprintf(" %s as `%s`,", columnName, tag.Key)
		}
	}
	return selectLabels
}

func getExistsNexistsFilter(op v3.FilterOperator, item v3.FilterItem) string {
	if _, ok := constants.StaticFieldsLogsV3[item.Key.Key]; ok && item.Key.Type == v3.AttributeKeyTypeUnspecified {
		// https://opentelemetry.io/docs/specs/otel/logs/data-model/
		// for top level keys of the log model: trace_id, span_id, severity_number, trace_flags etc
		// we don't have an exists column.
		// to check if they exists/nexists
		// we can use = 0 or != 0 for numbers
		// we can use = '' or != '' for strings
		chOp := "!="
		if op == v3.FilterOperatorNotExists {
			chOp = "="
		}
		key := getClickhouseKey(item.Key)
		if item.Key.DataType == v3.AttributeKeyDataTypeString {
			return fmt.Sprintf("%s %s ''", key, chOp)
		}
		// we just have two types, number and string for top level columns

		return fmt.Sprintf("%s %s 0", key, chOp)
	} else if item.Key.IsColumn {
		// get filter for materialized columns
		val := true
		if op == v3.FilterOperatorNotExists {
			val = false
		}
		return fmt.Sprintf("%s_exists`=%v", strings.TrimSuffix(getClickhouseKey(item.Key), "`"), val)
	}
	// filter for non materialized attributes
	columnType := logsV3.GetClickhouseLogsColumnType(item.Key.Type)
	columnDataType := getClickhouseLogsColumnDataType(item.Key.DataType)
	return fmt.Sprintf(logOperators[op], columnType, columnDataType, item.Key.Key)
}

func buildAttributeFilter(item v3.FilterItem) (string, error) {
	// check if the user is searching for value in all attributes
	key := item.Key.Key
	op := v3.FilterOperator(strings.ToLower(string(item.Operator)))

	var value interface{}
	var err error
	if op != v3.FilterOperatorExists && op != v3.FilterOperatorNotExists {
		value, err = utils.ValidateAndCastValue(item.Value, item.Key.DataType)
		if err != nil {
			return "", fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
		}
	}

	// TODO(nitya): as of now __attrs is only supports attributes_string. Discuss more on this
	// also for eq and contains as now it does a exact match
	if key == "__attrs" {
		if (op != v3.FilterOperatorEqual && op != v3.FilterOperatorContains) || item.Key.DataType != v3.AttributeKeyDataTypeString {
			return "", fmt.Errorf("only = operator and string data type is supported for __attrs")
		}
		val := utils.ClickHouseFormattedValue(item.Value)
		return fmt.Sprintf("has(mapValues(attributes_string), %s)", val), nil
	}

	keyName := getClickhouseKey(item.Key)
	fmtVal := utils.ClickHouseFormattedValue(value)

	if logsOp, ok := logOperators[op]; ok {
		switch op {
		case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
			return getExistsNexistsFilter(op, item), nil
		case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex:

			return fmt.Sprintf(logsOp, keyName, fmtVal), nil
		case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
			// we also want to treat %, _ as literals for contains
			val := utils.QuoteEscapedStringForContains(fmt.Sprintf("%s", item.Value), false)
			// for body the contains is case insensitive
			if keyName == BODY {
				logsOp = strings.Replace(logsOp, "ILIKE", "LIKE", 1) // removing i from ilike and not ilike
				return fmt.Sprintf("lower(%s) %s lower('%%%s%%')", keyName, logsOp, val), nil
			} else {
				return fmt.Sprintf("%s %s '%%%s%%'", keyName, logsOp, val), nil
			}
		case v3.FilterOperatorLike, v3.FilterOperatorNotLike:
			// for body use lower for like and ilike
			val := utils.QuoteEscapedString(fmt.Sprintf("%s", item.Value))
			if keyName == BODY {
				logsOp = strings.Replace(logsOp, "ILIKE", "LIKE", 1) // removing i from ilike and not ilike
				return fmt.Sprintf("lower(%s) %s lower('%s')", keyName, logsOp, val), nil
			} else {
				return fmt.Sprintf("%s %s '%s'", keyName, logsOp, val), nil
			}
		default:
			return fmt.Sprintf("%s %s %s", keyName, logsOp, fmtVal), nil
		}
	} else {
		return "", fmt.Errorf("unsupported operator: %s", op)
	}
}

func buildLogsTimeSeriesFilterQuery(fs *v3.FilterSet, groupBy []v3.AttributeKey, aggregateAttribute v3.AttributeKey) (string, error) {
	var conditions []string

	if fs == nil || len(fs.Items) == 0 {
		return "", nil
	}

	for _, item := range fs.Items {
		// skip if it's a resource attribute
		if item.Key.Type == v3.AttributeKeyTypeResource {
			continue
		}

		// if the filter is json filter
		if item.Key.IsJSON {
			filter, err := GetJSONFilter(item)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, filter)
			continue
		}

		// generate the filter
		filter, err := buildAttributeFilter(item)
		if err != nil {
			return "", err
		}
		conditions = append(conditions, filter)

		// add extra condition for map contains
		// by default clickhouse is not able to utilize indexes for keys with all operators.
		// mapContains forces the use of index.
		op := v3.FilterOperator(strings.ToLower(string(item.Operator)))
		if item.Key.IsColumn == false && op != v3.FilterOperatorExists && op != v3.FilterOperatorNotExists {
			conditions = append(conditions, getExistsNexistsFilter(v3.FilterOperatorExists, item))
		}
	}

	// add group by conditions to filter out log lines which doesn't have the key
	for _, attr := range groupBy {
		// skip if it's a resource attribute
		if attr.Type == v3.AttributeKeyTypeResource {
			continue
		}

		if !attr.IsColumn {
			columnType := logsV3.GetClickhouseLogsColumnType(attr.Type)
			columnDataType := getClickhouseLogsColumnDataType(attr.DataType)
			conditions = append(conditions, fmt.Sprintf("mapContains(%s_%s, '%s')", columnType, columnDataType, attr.Key))
		} else if attr.Type != v3.AttributeKeyTypeUnspecified {
			// for materialzied columns and not the top level static fields
			name := utils.GetClickhouseColumnNameV2(string(attr.Type), string(attr.DataType), attr.Key)
			conditions = append(conditions, fmt.Sprintf("`%s_exists`=true", name))
		}
	}

	// add conditions for aggregate attribute
	if aggregateAttribute.Key != "" && aggregateAttribute.Type != v3.AttributeKeyTypeResource {
		existsFilter := getExistsNexistsFilter(v3.FilterOperatorExists, v3.FilterItem{Key: aggregateAttribute})
		conditions = append(conditions, existsFilter)
	}

	queryString := strings.Join(conditions, " AND ")
	return queryString, nil
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
			name := getClickhouseKey(attr)
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

func generateAggregateClause(aggOp v3.AggregateOperator,
	aggKey string,
	step int64,
	preferRPM bool,
	timeFilter string,
	whereClause string,
	groupBy string,
	having string,
	orderBy string,
) (string, error) {
	queryTmpl := " %s as value from signoz_logs." + DISTRIBUTED_LOGS_V2 +
		" where " + timeFilter + "%s" +
		"%s%s" +
		"%s"
	switch aggOp {
	case v3.AggregateOperatorRate:
		rate := float64(step)
		if preferRPM {
			rate = rate / 60.0
		}

		op := fmt.Sprintf("count(%s)/%f", aggKey, rate)
		query := fmt.Sprintf(queryTmpl, op, whereClause, groupBy, having, orderBy)
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

		op := fmt.Sprintf("%s(%s)/%f", logsV3.AggregateOperatorToSQLFunc[aggOp], aggKey, rate)
		query := fmt.Sprintf(queryTmpl, op, whereClause, groupBy, having, orderBy)
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
		op := fmt.Sprintf("quantile(%v)(%s)", logsV3.AggregateOperatorToPercentile[aggOp], aggKey)
		query := fmt.Sprintf(queryTmpl, op, whereClause, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(%s)", logsV3.AggregateOperatorToSQLFunc[aggOp], aggKey)
		query := fmt.Sprintf(queryTmpl, op, whereClause, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCount:
		op := "toFloat64(count(*))"
		query := fmt.Sprintf(queryTmpl, op, whereClause, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggKey)
		query := fmt.Sprintf(queryTmpl, op, whereClause, groupBy, having, orderBy)
		return query, nil
	default:
		return "", fmt.Errorf("unsupported aggregate operator")
	}
}

func buildLogsQuery(panelType v3.PanelType, start, end, step int64, mq *v3.BuilderQuery, graphLimitQtype string, preferRPM bool) (string, error) {
	// timerange will be sent in epoch millisecond
	logsStart := utils.GetEpochNanoSecs(start)
	logsEnd := utils.GetEpochNanoSecs(end)

	// -1800 this is added so that the bucket start considers all the fingerprints.
	bucketStart := logsStart/NANOSECOND - 1800
	bucketEnd := logsEnd / NANOSECOND

	// timestamp filter , bucket_start filter is added for primary key
	timeFilter := fmt.Sprintf("(timestamp >= %d AND timestamp <= %d) AND (ts_bucket_start >= %d AND ts_bucket_start <= %d)", logsStart, logsEnd, bucketStart, bucketEnd)

	// build the where clause for main table
	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, mq.GroupBy, mq.AggregateAttribute)
	if err != nil {
		return "", err
	}
	if filterSubQuery != "" {
		filterSubQuery = " AND " + filterSubQuery
	}

	// build the where clause for resource table
	resourceSubQuery, err := resource.BuildResourceSubQuery(DB_NAME, DISTRIBUTED_LOGS_V2_RESOURCE, bucketStart, bucketEnd, mq.Filters, mq.GroupBy, mq.AggregateAttribute, false)
	if err != nil {
		return "", err
	}
	// join both the filter clauses
	if resourceSubQuery != "" {
		filterSubQuery = filterSubQuery + " AND (resource_fingerprint GLOBAL IN " + resourceSubQuery + ")"
	}

	// get the select labels
	selectLabels := getSelectLabels(mq.AggregateOperator, mq.GroupBy)

	// get the order by clause
	orderBy := orderByAttributeKeyTags(panelType, mq.OrderBy, mq.GroupBy)
	if panelType != v3.PanelTypeList && orderBy != "" {
		orderBy = " order by " + orderBy
	}

	// if noop create the query and return
	if mq.AggregateOperator == v3.AggregateOperatorNoOp {
		// with noop any filter or different order by other than ts will use new table
		sqlSelect := constants.LogsSQLSelectV2
		queryTmpl := sqlSelect + "from signoz_logs.%s where %s%s order by %s"
		query := fmt.Sprintf(queryTmpl, DISTRIBUTED_LOGS_V2, timeFilter, filterSubQuery, orderBy)
		return query, nil
		// ---- NOOP ends here ----
	}

	// ---- FOR aggregation queries ----

	// get the having conditions
	having := logsV3.Having(mq.Having)
	if having != "" {
		having = " having " + having
	}

	// get the group by clause
	groupBy := logsV3.GroupByAttributeKeyTags(panelType, graphLimitQtype, mq.GroupBy...)
	if panelType != v3.PanelTypeList && groupBy != "" {
		groupBy = " group by " + groupBy
	}

	// get the aggregation key
	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		aggregationKey = getClickhouseKey(mq.AggregateAttribute)
	}

	// for limit queries, there are two queries formed
	// in the second query we need to add the placeholder so that first query can be placed
	if graphLimitQtype == constants.SecondQueryGraphLimit {
		filterSubQuery = filterSubQuery + " AND " + fmt.Sprintf("(%s) GLOBAL IN (", logsV3.GetSelectKeys(mq.AggregateOperator, mq.GroupBy)) + "#LIMIT_PLACEHOLDER)"
	}

	aggClause, err := generateAggregateClause(mq.AggregateOperator, aggregationKey, step, preferRPM, timeFilter, filterSubQuery, groupBy, having, orderBy)
	if err != nil {
		return "", err
	}

	var queryTmplPrefix string
	if graphLimitQtype == constants.FirstQueryGraphLimit {
		queryTmplPrefix = "SELECT"
	} else if panelType == v3.PanelTypeTable {
		queryTmplPrefix =
			"SELECT"
	} else if panelType == v3.PanelTypeGraph || panelType == v3.PanelTypeValue {
		// Select the aggregate value for interval
		queryTmplPrefix =
			fmt.Sprintf("SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL %d SECOND) AS ts,", step)
	}

	query := queryTmplPrefix + selectLabels + aggClause

	// for limit query this is the first query,
	// we don't the the aggregation value here as we are just concerned with the names of group by
	// for applying the limit
	if graphLimitQtype == constants.FirstQueryGraphLimit {
		query = "SELECT " + logsV3.GetSelectKeys(mq.AggregateOperator, mq.GroupBy) + " from (" + query + ")"
	}
	return query, nil
}

func buildLogsLiveTailQuery(mq *v3.BuilderQuery) (string, error) {
	filterSubQuery, err := buildLogsTimeSeriesFilterQuery(mq.Filters, mq.GroupBy, v3.AttributeKey{})
	if err != nil {
		return "", err
	}

	// no values for bucket start and end
	resourceSubQuery, err := resource.BuildResourceSubQuery(DB_NAME, DISTRIBUTED_LOGS_V2_RESOURCE, 0, 0, mq.Filters, mq.GroupBy, mq.AggregateAttribute, true)
	if err != nil {
		return "", err
	}
	// join both the filter clauses
	if resourceSubQuery != "" {
		if filterSubQuery != "" {
			filterSubQuery = filterSubQuery + " AND (resource_fingerprint GLOBAL IN " + resourceSubQuery
		} else {
			filterSubQuery = "(resource_fingerprint GLOBAL IN " + resourceSubQuery
		}
	}

	// the reader will add the timestamp and id filters
	switch mq.AggregateOperator {
	case v3.AggregateOperatorNoOp:
		query := constants.LogsSQLSelectV2 + "from signoz_logs." + DISTRIBUTED_LOGS_V2 + " where "
		if len(filterSubQuery) > 0 {
			query = query + filterSubQuery + " AND "
		}

		return query, nil
	default:
		return "", fmt.Errorf("unsupported aggregate operator in live tail")
	}
}

// PrepareLogsQuery prepares the query for logs
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
		// give me just the group_by names (no values)
		query, err := buildLogsQuery(panelType, start, end, mq.StepInterval, mq, options.GraphLimitQtype, options.PreferRPM)
		if err != nil {
			return "", err
		}
		query = logsV3.AddLimitToQuery(query, mq.Limit)

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
		query, err = logsV3.ReduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}

	if panelType == v3.PanelTypeList {
		// check if limit exceeded
		if mq.Limit > 0 && mq.Offset >= mq.Limit {
			return "", fmt.Errorf("max limit exceeded")
		}

		if mq.PageSize > 0 {
			if mq.Limit > 0 && mq.Offset+mq.PageSize > mq.Limit {
				query = logsV3.AddLimitToQuery(query, mq.Limit-mq.Offset)
			} else {
				query = logsV3.AddLimitToQuery(query, mq.PageSize)
			}

			// add offset to the query only if it is not orderd by timestamp.
			if !logsV3.IsOrderByTs(mq.OrderBy) {
				query = logsV3.AddOffsetToQuery(query, mq.Offset)
			}

		} else {
			query = logsV3.AddLimitToQuery(query, mq.Limit)
		}
	} else if panelType == v3.PanelTypeTable {
		query = logsV3.AddLimitToQuery(query, mq.Limit)
	}

	return query, err
}
