package v3

import (
	"fmt"
	"math"
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
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
	v3.FilterOperatorRegex:           "match(%s, %s)",
	v3.FilterOperatorNotRegex:        "NOT match(%s, %s)",
	v3.FilterOperatorContains:        "ILIKE",
	v3.FilterOperatorNotContains:     "NOT ILIKE",
	v3.FilterOperatorExists:          "has(%s%s, '%s')",
	v3.FilterOperatorNotExists:       "NOT has(%s%s, '%s')",
}

func getColumnName(key v3.AttributeKey) string {
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
func getSelectLabels(aggregatorOperator v3.AggregateOperator, groupBy []v3.AttributeKey) string {
	var selectLabels string
	if aggregatorOperator == v3.AggregateOperatorNoOp {
		selectLabels = ""
	} else {
		for _, tag := range groupBy {
			filterName := getColumnName(tag)
			selectLabels += fmt.Sprintf(" %s as `%s`,", filterName, tag.Key)
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
			selectLabels = append(selectLabels, fmt.Sprintf("`%s`", tag.Key))
		}
	}
	return strings.Join(selectLabels, ",")
}

func getSelectColumns(sc []v3.AttributeKey) string {
	var columns []string
	for _, tag := range sc {
		columnName := getColumnName(tag)
		columns = append(columns, fmt.Sprintf("%s as `%s` ", columnName, tag.Key))
	}
	return strings.Join(columns, ",")
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

func buildTracesFilterQuery(fs *v3.FilterSet) (string, error) {
	var conditions []string

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
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
					val = utils.QuoteEscapedString(fmt.Sprintf("%v", item.Value))
					conditions = append(conditions, fmt.Sprintf("%s %s '%%%s%%'", columnName, operator, val))
				case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex:
					conditions = append(conditions, fmt.Sprintf(operator, columnName, fmtVal))
				case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
					if item.Key.IsColumn {
						subQuery, err := ExistsSubQueryForFixedColumn(item.Key, item.Operator)
						if err != nil {
							return "", err
						}
						conditions = append(conditions, subQuery)
					} else {
						columnType, columnDataType := getClickhouseTracesColumnDataTypeAndType(item.Key)
						conditions = append(conditions, fmt.Sprintf(operator, columnDataType, columnType, item.Key.Key))
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

func ExistsSubQueryForFixedColumn(key v3.AttributeKey, op v3.FilterOperator) (string, error) {
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

func handleEmptyValuesInGroupBy(groupBy []v3.AttributeKey) (string, error) {
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

func enrichOrderBy(items []v3.OrderBy, keys map[string]v3.AttributeKey) []v3.OrderBy {
	enrichedItems := []v3.OrderBy{}
	for i := 0; i < len(items); i++ {
		attributeKey := enrichKeyWithMetadata(v3.AttributeKey{
			Key: items[i].ColumnName,
		}, keys)
		enrichedItems = append(enrichedItems, v3.OrderBy{
			ColumnName: items[i].ColumnName,
			Order:      items[i].Order,
			Key:        attributeKey.Key,
			DataType:   attributeKey.DataType,
			Type:       attributeKey.Type,
			IsColumn:   attributeKey.IsColumn,
		})
	}
	return enrichedItems
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
		groupTags = append(groupTags, fmt.Sprintf("`%s`", tag.Key))
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
			name := getColumnName(attr)
			if item.IsColumn {
				orderBy = append(orderBy, fmt.Sprintf("`%s` %s", name, item.Order))
			} else {
				orderBy = append(orderBy, fmt.Sprintf("%s %s", name, item.Order))
			}
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
		} else if panelType == v3.PanelTypeGraph {
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

func ReduceToQuery(query string, reduceTo v3.ReduceToOperator, _ v3.AggregateOperator) (string, error) {

	var groupBy string
	switch reduceTo {
	case v3.ReduceToOperatorLast:
		query = fmt.Sprintf("SELECT anyLast(value) as value, now() as ts FROM (%s) %s", query, groupBy)
	case v3.ReduceToOperatorSum:
		query = fmt.Sprintf("SELECT sum(value) as value, now() as ts FROM (%s) %s", query, groupBy)
	case v3.ReduceToOperatorAvg:
		query = fmt.Sprintf("SELECT avg(value) as value, now() as ts FROM (%s) %s", query, groupBy)
	case v3.ReduceToOperatorMax:
		query = fmt.Sprintf("SELECT max(value) as value, now() as ts FROM (%s) %s", query, groupBy)
	case v3.ReduceToOperatorMin:
		query = fmt.Sprintf("SELECT min(value) as value, now() as ts FROM (%s) %s", query, groupBy)
	default:
		return "", fmt.Errorf("unsupported reduce operator")
	}
	return query, nil
}

func AddLimitToQuery(query string, limit uint64) string {
	if limit == 0 {
		limit = 100
	}
	return fmt.Sprintf("%s LIMIT %d", query, limit)
}

func AddOffsetToQuery(query string, offset uint64) string {
	return fmt.Sprintf("%s OFFSET %d", query, offset)
}

// PrepareTracesQuery returns the query string for traces
// start and end are in epoch millisecond
// step is in seconds
func PrepareTracesQuery(start, end int64, panelType v3.PanelType, mq *v3.BuilderQuery, options v3.QBOptions) (string, error) {
	// TODO: remove v3 completely step by step
	return "", nil
}

func Enrich(params *v3.QueryRangeParamsV3, keys map[string]v3.AttributeKey) {
	if params.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		for _, query := range params.CompositeQuery.BuilderQueries {
			if query.DataSource == v3.DataSourceTraces {
				EnrichTracesQuery(query, keys)
			}
		}
	}
}

func EnrichTracesQuery(query *v3.BuilderQuery, keys map[string]v3.AttributeKey) {
	// enrich aggregate attribute
	query.AggregateAttribute = enrichKeyWithMetadata(query.AggregateAttribute, keys)
	// enrich filter items
	if query.Filters != nil && len(query.Filters.Items) > 0 {
		for idx, filter := range query.Filters.Items {
			query.Filters.Items[idx].Key = enrichKeyWithMetadata(filter.Key, keys)
		}
	}
	// enrich group by
	for idx, groupBy := range query.GroupBy {
		query.GroupBy[idx] = enrichKeyWithMetadata(groupBy, keys)
	}
	// enrich order by
	query.OrderBy = enrichOrderBy(query.OrderBy, keys)
	// enrich select columns
	for idx, selectColumn := range query.SelectColumns {
		query.SelectColumns[idx] = enrichKeyWithMetadata(selectColumn, keys)
	}
}
