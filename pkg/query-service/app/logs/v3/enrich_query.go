package v3

import (
	"fmt"
	"strconv"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func EnrichmentRequired(params *v3.QueryRangeParamsV3) bool {
	compositeQuery := params.CompositeQuery
	if compositeQuery == nil {
		return false
	}

	// Build queries for each builder query
	for queryName, query := range compositeQuery.BuilderQueries {
		if query.Expression != queryName || query.DataSource != v3.DataSourceLogs {
			continue
		}

		// check aggregation attribute
		if query.AggregateAttribute.Key != "" {
			if !isEnriched(query.AggregateAttribute) {
				return true
			}
		}

		// check filter attribute
		if query.Filters != nil && len(query.Filters.Items) != 0 {
			for _, item := range query.Filters.Items {
				if !isEnriched(item.Key) {
					return true
				}
			}
		}

		groupByLookup := map[string]struct{}{}
		// check groupby
		for _, groupBy := range query.GroupBy {
			if !isEnriched(groupBy) {
				return true
			}
			groupByLookup[groupBy.Key] = struct{}{}
		}

		// check orderby
		for _, orderBy := range query.OrderBy {
			if _, ok := groupByLookup[orderBy.ColumnName]; !ok {
				key := v3.AttributeKey{Key: orderBy.ColumnName}
				if !isEnriched(key) {
					return true
				}
			}
		}

	}

	return false
}

// if the field is timestamp/id/value we don't need to enrich
// if the field is static we don't need to enrich
// for all others we need to enrich
// an attribute/resource can be materialized/dematerialized
// but the query should work regardless and shouldn't fail
func isEnriched(field v3.AttributeKey) bool {
	// if it is timestamp/id dont check
	if field.Key == "timestamp" || field.Key == "id" || field.Key == constants.SigNozOrderByValue || field.Type == v3.AttributeKeyTypeInstrumentationScope {
		return true
	}

	// don't need to enrich the static fields as they will be always used a column
	if _, ok := constants.StaticFieldsLogsV3[field.Key]; ok && field.IsColumn {
		return true
	}

	return false
}

func Enrich(params *v3.QueryRangeParamsV3, fields map[string]v3.AttributeKey) {
	compositeQuery := params.CompositeQuery
	if compositeQuery == nil {
		return
	}

	// Build queries for each builder query
	for queryName, query := range compositeQuery.BuilderQueries {
		if query.Expression != queryName && query.DataSource != v3.DataSourceLogs {
			continue
		}
		EnrichLogsQuery(query, fields)
	}
}

func EnrichLogsQuery(query *v3.BuilderQuery, fields map[string]v3.AttributeKey) error {
	// enrich aggregation attribute
	if query.AggregateAttribute.Key != "" {
		query.AggregateAttribute = enrichFieldWithMetadata(query.AggregateAttribute, fields)
	}

	// enrich filter attribute
	if query.Filters != nil && len(query.Filters.Items) != 0 {
		for i := 0; i < len(query.Filters.Items); i++ {
			query.Filters.Items[i] = jsonFilterEnrich(query.Filters.Items[i])
			if query.Filters.Items[i].Key.IsJSON {
				query.Filters.Items[i] = jsonReplaceField(query.Filters.Items[i], fields)
				continue
			}
			query.Filters.Items[i].Key = enrichFieldWithMetadata(query.Filters.Items[i].Key, fields)
		}
	}

	// enrich groupby
	for i := 0; i < len(query.GroupBy); i++ {
		query.GroupBy[i] = enrichFieldWithMetadata(query.GroupBy[i], fields)
	}

	// enrich orderby
	for i := 0; i < len(query.OrderBy); i++ {
		key := v3.AttributeKey{Key: query.OrderBy[i].ColumnName}
		key = enrichFieldWithMetadata(key, fields)
		query.OrderBy[i].Key = key.Key
		query.OrderBy[i].Type = key.Type
		query.OrderBy[i].DataType = key.DataType
		query.OrderBy[i].IsColumn = key.IsColumn
	}
	return nil
}

func enrichFieldWithMetadata(field v3.AttributeKey, fields map[string]v3.AttributeKey) v3.AttributeKey {
	if isEnriched(field) {
		return field
	}

	// if type is unknown check if it is a top level key
	if v, ok := constants.StaticFieldsLogsV3[field.Key]; ok {
		return v
	}

	// check if the field is present in the fields map
	for _, key := range utils.GenerateEnrichmentKeys(field) {
		if val, ok := fields[key]; ok {
			return val
		}
	}

	// enrich with default values if metadata is not found
	if field.Type == "" {
		field.Type = v3.AttributeKeyTypeTag
	}
	if field.DataType == "" {
		field.DataType = v3.AttributeKeyDataTypeString
	}
	return field
}

func jsonFilterEnrich(filter v3.FilterItem) v3.FilterItem {
	// check if it is a json request
	if !strings.HasPrefix(filter.Key.Key, "body.") {
		return filter
	}

	// check if the value is a int, float, string, bool
	valueType := ""
	switch filter.Value.(type) {
	// even the filter value is an array the actual type of the value is string.
	case []interface{}:
		// check first value type in array and use that
		if len(filter.Value.([]interface{})) > 0 {
			firstVal := filter.Value.([]interface{})[0]
			switch firstVal.(type) {
			case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
				valueType = "int64"
			case float32, float64:
				valueType = "float64"
			case bool:
				valueType = "bool"
			default:
				valueType = "string"
			}
		}
	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
		valueType = "int64"
	case float32, float64:
		valueType = "float64"
	case string:
		valueType, filter.Value = parseStrValue(filter.Value.(string), filter.Operator)
	case bool:
		valueType = "bool"
	}

	// check if it is array
	if strings.HasSuffix(filter.Key.Key, "[*]") {
		valueType = fmt.Sprintf("array(%s)", valueType)
	}

	filter.Key.DataType = v3.AttributeKeyDataType(valueType)
	filter.Key.IsJSON = true
	return filter
}

func jsonReplaceField(filter v3.FilterItem, fields map[string]v3.AttributeKey) v3.FilterItem {
	key, found := strings.CutPrefix(filter.Key.Key, "body.")
	if !found {
		return filter
	}

	if field, ok := fields[key]; ok && field.DataType == filter.Key.DataType {
		filter.Key = field
	}

	return filter
}

func parseStrValue(valueStr string, operator v3.FilterOperator) (string, interface{}) {

	valueType := "string"

	// for the following operators it will always be string
	if operator == v3.FilterOperatorContains || operator == v3.FilterOperatorNotContains ||
		operator == v3.FilterOperatorRegex || operator == v3.FilterOperatorNotRegex ||
		operator == v3.FilterOperatorLike || operator == v3.FilterOperatorNotLike {
		return valueType, valueStr
	}

	var err error
	var parsedValue interface{}
	if parsedValue, err = strconv.ParseBool(valueStr); err == nil {
		valueType = "bool"
	} else if parsedValue, err = strconv.ParseInt(valueStr, 10, 64); err == nil {
		valueType = "int64"
	} else if parsedValue, err = strconv.ParseFloat(valueStr, 64); err == nil {
		valueType = "float64"
	} else {
		parsedValue = valueStr
		valueType = "string"
	}

	return valueType, parsedValue
}
