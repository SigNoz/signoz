package v4

import (
	"fmt"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/app/resource"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

const NANOSECOND = 1000000000

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
	v3.FilterOperatorRegex:           "match(%s, %s)",
	v3.FilterOperatorNotRegex:        "NOT match(%s, %s)",
	v3.FilterOperatorContains:        "ILIKE",
	v3.FilterOperatorNotContains:     "NOT ILIKE",
	v3.FilterOperatorExists:          "mapContains(%s, '%s')",
	v3.FilterOperatorNotExists:       "NOT mapContains(%s, '%s')",
}

func getClickHouseTracesColumnType(columnType v3.AttributeKeyType) string {
	if columnType == v3.AttributeKeyTypeResource {
		return "resources"
	}
	return "attributes"
}

func getClickHouseTracesColumnDataType(columnDataType v3.AttributeKeyDataType) string {
	if columnDataType == v3.AttributeKeyDataTypeFloat64 || columnDataType == v3.AttributeKeyDataTypeInt64 {
		return "number"
	}
	if columnDataType == v3.AttributeKeyDataTypeBool {
		return "bool"
	}
	return "string"
}

func getColumnName(key v3.AttributeKey) string {
	// if key present in static return as it is
	if _, ok := constants.StaticFieldsTraces[key.Key]; ok {
		return key.Key
	}

	if !key.IsColumn {
		keyType := getClickHouseTracesColumnType(key.Type)
		keyDType := getClickHouseTracesColumnDataType(key.DataType)
		return fmt.Sprintf("%s_%s['%s']", keyType, keyDType, key.Key)
	}

	return "`" + utils.GetClickhouseColumnNameV2(string(key.Type), string(key.DataType), key.Key) + "`"
}

// getSelectLabels returns the select labels for the query based on groupBy and aggregateOperator
func getSelectLabels(groupBy []v3.AttributeKey) string {
	var labels []string
	for _, tag := range groupBy {
		name := getColumnName(tag)
		labels = append(labels, fmt.Sprintf(" %s as `%s`", name, tag.Key))
	}
	return strings.Join(labels, ",")
}

// TODO(nitya): use the _exists columns as well in the future similar to logs
func existsSubQueryForFixedColumn(key v3.AttributeKey, op v3.FilterOperator) (string, error) {
	if key.DataType == v3.AttributeKeyDataTypeString {
		if op == v3.FilterOperatorExists {
			return fmt.Sprintf("%s %s ''", getColumnName(key), tracesOperatorMappingV3[v3.FilterOperatorNotEqual]), nil
		} else {
			return fmt.Sprintf("%s %s ''", getColumnName(key), tracesOperatorMappingV3[v3.FilterOperatorEqual]), nil
		}
	} else {
		return "", fmt.Errorf("unsupported operation, exists and not exists can only be applied on custom attributes or string type columns")
	}
}

func buildTracesFilterQuery(fs *v3.FilterSet) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {

			// skip if it's a resource attribute or Span search scope attribute
			if item.Key.Type == v3.AttributeKeyTypeResource || item.Key.Type == v3.AttributeKeyTypeSpanSearchScope {
				continue
			}

			val := item.Value
			// generate the key
			columnName := getColumnName(item.Key)
			var fmtVal string
			item.Operator = v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
			if item.Operator != v3.FilterOperatorExists && item.Operator != v3.FilterOperatorNotExists {
				var err error
				val, err = utils.ValidateAndCastValue(val, item.Key.DataType)
				if err != nil {
					return "", fmt.Errorf("invalid value for key %s: %v", item.Key.Key, err)
				}
			}
			if val != nil {
				fmtVal = utils.ClickHouseFormattedValue(val)
			}
			if operator, ok := tracesOperatorMappingV3[item.Operator]; ok {
				switch item.Operator {
				case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
					// we also want to treat %, _ as literals for contains
					val := utils.QuoteEscapedStringForContains(fmt.Sprintf("%s", item.Value), false)
					conditions = append(conditions, fmt.Sprintf("%s %s '%%%s%%'", columnName, operator, val))
				case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex:
					conditions = append(conditions, fmt.Sprintf(operator, columnName, fmtVal))
				case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
					if item.Key.IsColumn {
						subQuery, err := existsSubQueryForFixedColumn(item.Key, item.Operator)
						if err != nil {
							return "", err
						}
						conditions = append(conditions, subQuery)
					} else {
						cType := getClickHouseTracesColumnType(item.Key.Type)
						cDataType := getClickHouseTracesColumnDataType(item.Key.DataType)
						col := fmt.Sprintf("%s_%s", cType, cDataType)
						conditions = append(conditions, fmt.Sprintf(operator, col, item.Key.Key))
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

	return queryString, nil
}

func handleEmptyValuesInGroupBy(groupBy []v3.AttributeKey) (string, error) {
	// TODO(nitya): in future when we support user based mat column handle them
	// skipping now as we don't support creating them
	filterItems := []v3.FilterItem{}
	if len(groupBy) != 0 {
		for _, item := range groupBy {
			if !item.IsColumn {
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
		return buildTracesFilterQuery(&filterSet)
	}
	return "", nil
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
			name := getColumnName(attr)
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

func buildSpanScopeQuery(fs *v3.FilterSet) (string, error) {
	var query string
	if fs == nil || len(fs.Items) == 0 {
		return "", nil
	}
	for _, item := range fs.Items {
		// skip anything other than Span Search scope attribute
		if item.Key.Type != v3.AttributeKeyTypeSpanSearchScope {
			continue
		}
		keyName := strings.ToLower(item.Key.Key)

		if keyName == constants.SpanSearchScopeRoot {
			query = "parent_span_id = '' "
			return query, nil
		} else if keyName == constants.SpanSearchScopeEntryPoint {
			query = "((name, `resource_string_service$$name`) GLOBAL IN ( SELECT DISTINCT name, serviceName from " + constants.SIGNOZ_TRACE_DBNAME + "." + constants.SIGNOZ_TOP_LEVEL_OPERATIONS_TABLENAME + " )) AND parent_span_id != '' "
			return query, nil
		} else {
			return "", fmt.Errorf("invalid scope item type: %s", item.Key.Type)
		}
	}
	return "", nil
}

func buildTracesQuery(start, end, step int64, mq *v3.BuilderQuery, panelType v3.PanelType, options v3.QBOptions) (string, error) {
	tracesStart := utils.GetEpochNanoSecs(start)
	tracesEnd := utils.GetEpochNanoSecs(end)

	// -1800 this is added so that the bucket start considers all the fingerprints.
	bucketStart := tracesStart/NANOSECOND - 1800
	bucketEnd := tracesEnd / NANOSECOND

	timeFilter := fmt.Sprintf("(timestamp >= '%d' AND timestamp <= '%d') AND (ts_bucket_start >= %d AND ts_bucket_start <= %d)", tracesStart, tracesEnd, bucketStart, bucketEnd)

	filterSubQuery, err := buildTracesFilterQuery(mq.Filters)
	if err != nil {
		return "", err
	}
	if filterSubQuery != "" {
		filterSubQuery = " AND " + filterSubQuery
	}

	emptyValuesInGroupByFilter, err := handleEmptyValuesInGroupBy(mq.GroupBy)
	if err != nil {
		return "", err
	}
	if emptyValuesInGroupByFilter != "" {
		filterSubQuery = filterSubQuery + " AND " + emptyValuesInGroupByFilter
	}

	resourceSubQuery, err := resource.BuildResourceSubQuery("signoz_traces", "distributed_traces_v3_resource", bucketStart, bucketEnd, mq.Filters, mq.GroupBy, mq.AggregateAttribute, false)
	if err != nil {
		return "", err
	}
	// join both the filter clauses
	if resourceSubQuery != "" {
		filterSubQuery = filterSubQuery + " AND (resource_fingerprint GLOBAL IN " + resourceSubQuery + ")"
	}

	spanScopeSubQuery, err := buildSpanScopeQuery(mq.Filters)
	if spanScopeSubQuery != "" {
		filterSubQuery = filterSubQuery + " AND " + spanScopeSubQuery
	}

	// timerange will be sent in epoch millisecond
	selectLabels := getSelectLabels(mq.GroupBy)
	if selectLabels != "" {
		selectLabels = selectLabels + ","
	}

	orderBy := orderByAttributeKeyTags(panelType, mq.OrderBy, mq.GroupBy)
	if orderBy != "" {
		orderBy = " order by " + orderBy
	}

	if mq.AggregateOperator == v3.AggregateOperatorNoOp {
		var query string
		if panelType == v3.PanelTypeTrace {
			withSubQuery := fmt.Sprintf(constants.TracesExplorerViewSQLSelectWithSubQuery, constants.SIGNOZ_TRACE_DBNAME, constants.SIGNOZ_SPAN_INDEX_V3_LOCAL_TABLENAME, timeFilter)
			afterSubQuery := tracesV3.AddLimitToQuery(constants.TracesExplorerViewSQLSelectAfterSubQuery, mq.Limit)
			if mq.Offset != 0 {
				afterSubQuery = tracesV3.AddOffsetToQuery(afterSubQuery, mq.Offset)
			}
			query = fmt.Sprintf(constants.TracesExplorerViewSQLSelectBeforeSubQuery, constants.SIGNOZ_TRACE_DBNAME, constants.SIGNOZ_SPAN_INDEX_V3) + withSubQuery + ") " + fmt.Sprintf(afterSubQuery, constants.SIGNOZ_TRACE_DBNAME, constants.SIGNOZ_SPAN_INDEX_V3, timeFilter, filterSubQuery)
			// adding this to avoid the distributed product mode error which doesn't allow global in
			query += " settings distributed_product_mode='allow', max_memory_usage=10000000000"
		} else if panelType == v3.PanelTypeList {
			if len(mq.SelectColumns) == 0 {
				return "", fmt.Errorf("select columns cannot be empty for panelType %s", panelType)
			}
			selectLabels = getSelectLabels(mq.SelectColumns)
			// add it to the select labels
			queryNoOpTmpl := fmt.Sprintf("SELECT timestamp as timestamp_datetime, spanID, traceID,%s ", selectLabels) + "from " + constants.SIGNOZ_TRACE_DBNAME + "." + constants.SIGNOZ_SPAN_INDEX_V3 + " where %s %s" + "%s"
			query = fmt.Sprintf(queryNoOpTmpl, timeFilter, filterSubQuery, orderBy)
		} else {
			return "", fmt.Errorf("unsupported aggregate operator %s for panelType %s", mq.AggregateOperator, panelType)
		}
		return query, nil
		// ---- NOOP ends here ----
	}

	having := tracesV3.Having(mq.Having)
	if having != "" {
		having = " having " + having
	}

	groupBy := tracesV3.GroupByAttributeKeyTags(panelType, options.GraphLimitQtype, mq.GroupBy...)
	if groupBy != "" {
		groupBy = " group by " + groupBy
	}

	aggregationKey := ""
	if mq.AggregateAttribute.Key != "" {
		aggregationKey = getColumnName(mq.AggregateAttribute)
	}

	var queryTmpl string
	if options.GraphLimitQtype == constants.FirstQueryGraphLimit {
		queryTmpl = "SELECT"
	} else if panelType == v3.PanelTypeTable {
		queryTmpl =
			"SELECT "
	} else if panelType == v3.PanelTypeGraph || panelType == v3.PanelTypeValue {
		// Select the aggregate value for interval
		queryTmpl =
			fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d SECOND) AS ts,", step)
	}

	queryTmpl = queryTmpl + selectLabels +
		" %s as value " +
		"from " + constants.SIGNOZ_TRACE_DBNAME + "." + constants.SIGNOZ_SPAN_INDEX_V3 +
		" where " + timeFilter + "%s" +
		"%s%s" +
		"%s"

	// we don't need value for first query
	if options.GraphLimitQtype == constants.FirstQueryGraphLimit {
		queryTmpl = "SELECT " + tracesV3.GetSelectKeys(mq.AggregateOperator, mq.GroupBy) + " from (" + queryTmpl + ")"
	}

	if options.GraphLimitQtype == constants.SecondQueryGraphLimit {
		filterSubQuery = filterSubQuery + " AND " + fmt.Sprintf("(%s) GLOBAL IN (", tracesV3.GetSelectKeys(mq.AggregateOperator, mq.GroupBy)) + "#LIMIT_PLACEHOLDER)"
	}

	switch mq.AggregateOperator {
	case v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRateMin,
		v3.AggregateOperatorRate:

		rate := float64(step)
		if options.PreferRPM {
			rate = rate / 60.0
		}

		op := fmt.Sprintf("%s(%s)/%f", tracesV3.AggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey, rate)
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
		op := fmt.Sprintf("quantile(%v)(%s)", tracesV3.AggregateOperatorToPercentile[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorAvg, v3.AggregateOperatorSum, v3.AggregateOperatorMin, v3.AggregateOperatorMax:
		op := fmt.Sprintf("%s(%s)", tracesV3.AggregateOperatorToSQLFunc[mq.AggregateOperator], aggregationKey)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCount:
		if mq.AggregateAttribute.Key != "" {
			if mq.AggregateAttribute.IsColumn {
				subQuery, err := existsSubQueryForFixedColumn(mq.AggregateAttribute, v3.FilterOperatorExists)
				if err == nil {
					filterSubQuery = fmt.Sprintf("%s AND %s", filterSubQuery, subQuery)
				}
			} else {
				cType := getClickHouseTracesColumnType(mq.AggregateAttribute.Type)
				cDataType := getClickHouseTracesColumnDataType(mq.AggregateAttribute.DataType)
				filterSubQuery = fmt.Sprintf("%s AND mapContains(%s_%s, '%s')", filterSubQuery, cType, cDataType, mq.AggregateAttribute.Key)
			}
		}
		op := "toFloat64(count())"
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	case v3.AggregateOperatorCountDistinct:
		op := fmt.Sprintf("toFloat64(count(distinct(%s)))", aggregationKey)
		query := fmt.Sprintf(queryTmpl, op, filterSubQuery, groupBy, having, orderBy)
		return query, nil
	default:
		return "", fmt.Errorf("unsupported aggregate operator %s", mq.AggregateOperator)
	}
}

// PrepareTracesQuery returns the query string for traces
// start and end are in epoch millisecond
// step is in seconds
func PrepareTracesQuery(start, end int64, panelType v3.PanelType, mq *v3.BuilderQuery, options v3.QBOptions) (string, error) {
	// adjust the start and end time to the step interval
	if panelType == v3.PanelTypeGraph {
		// adjust the start and end time to the step interval for graph panel types
		start = start - (start % (mq.StepInterval * 1000))
		end = end - (end % (mq.StepInterval * 1000))
	}
	if options.GraphLimitQtype == constants.FirstQueryGraphLimit {
		// give me just the group by names
		query, err := buildTracesQuery(start, end, mq.StepInterval, mq, panelType, options)
		if err != nil {
			return "", err
		}
		query = tracesV3.AddLimitToQuery(query, mq.Limit)

		return query, nil
	} else if options.GraphLimitQtype == constants.SecondQueryGraphLimit {
		query, err := buildTracesQuery(start, end, mq.StepInterval, mq, panelType, options)
		if err != nil {
			return "", err
		}
		return query, nil
	}

	query, err := buildTracesQuery(start, end, mq.StepInterval, mq, panelType, options)
	if err != nil {
		return "", err
	}
	if panelType == v3.PanelTypeValue {
		query, err = tracesV3.ReduceToQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}
	if panelType == v3.PanelTypeList || panelType == v3.PanelTypeTable {
		query = tracesV3.AddLimitToQuery(query, mq.Limit)

		if mq.Offset != 0 {
			query = tracesV3.AddOffsetToQuery(query, mq.Offset)
		}
	}
	return query, err
}
