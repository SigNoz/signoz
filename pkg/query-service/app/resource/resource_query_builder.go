package resource

import (
	"fmt"
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var resourceLogOperators = map[v3.FilterOperator]string{
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

// buildResourceFilter builds a clickhouse filter string for resource labels
func buildResourceFilter(logsOp string, key string, op v3.FilterOperator, value interface{}) string {
	// for all operators except contains and like
	searchKey := fmt.Sprintf("simpleJSONExtractString(labels, '%s')", key)

	// for contains and like it will be case insensitive
	lowerSearchKey := fmt.Sprintf("simpleJSONExtractString(lower(labels), '%s')", key)

	chFmtVal := utils.ClickHouseFormattedValue(value)

	lowerValue := strings.ToLower(fmt.Sprintf("%s", value))

	switch op {
	case v3.FilterOperatorExists:
		return fmt.Sprintf("simpleJSONHas(labels, '%s')", key)
	case v3.FilterOperatorNotExists:
		return fmt.Sprintf("not simpleJSONHas(labels, '%s')", key)
	case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex:
		return fmt.Sprintf(logsOp, searchKey, chFmtVal)
	case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
		// this is required as clickhouseFormattedValue add's quotes to the string
		// we also want to treat %, _ as literals for contains
		escapedStringValue := utils.QuoteEscapedStringForContains(lowerValue, false)
		return fmt.Sprintf("%s %s '%%%s%%'", lowerSearchKey, logsOp, escapedStringValue)
	case v3.FilterOperatorLike, v3.FilterOperatorNotLike:
		// this is required as clickhouseFormattedValue add's quotes to the string
		escapedStringValue := utils.QuoteEscapedString(lowerValue)
		return fmt.Sprintf("%s %s '%s'", lowerSearchKey, logsOp, escapedStringValue)
	default:
		return fmt.Sprintf("%s %s %s", searchKey, logsOp, chFmtVal)
	}
}

// buildIndexFilterForInOperator builds a clickhouse filter string for in operator
// example:= x in a,b,c = (labels like '%"x"%"a"%' or labels like '%"x":"b"%' or labels like '%"x"="c"%')
// example:= x nin a,b,c = (labels nlike '%"x"%"a"%' AND labels nlike '%"x"="b"' AND labels nlike '%"x"="c"%')
func buildIndexFilterForInOperator(key string, op v3.FilterOperator, value interface{}) string {
	conditions := []string{}
	separator := " OR "
	sqlOp := "like"
	if op == v3.FilterOperatorNotIn {
		separator = " AND "
		sqlOp = "not like"
	}

	// values is a slice of strings, we need to convert value to this type
	// value can be string or []interface{}
	values := []string{}
	switch value.(type) {
	case string:
		values = append(values, value.(string))
	case []interface{}:
		for _, v := range (value).([]interface{}) {
			// also resources attributes are always string values
			strV, ok := v.(string)
			if !ok {
				continue
			}
			values = append(values, strV)
		}
	}

	// if there are no values to filter on, return an empty string
	if len(values) > 0 {
		for _, v := range values {
			value := utils.QuoteEscapedStringForContains(v, true)
			conditions = append(conditions, fmt.Sprintf("labels %s '%%\"%s\":\"%s\"%%'", sqlOp, key, value))
		}
		return "(" + strings.Join(conditions, separator) + ")"
	}
	return ""
}

// buildResourceIndexFilter builds a clickhouse filter string for resource labels
// example:= x like '%john%' = labels like '%x%john%'
// we have two indexes for resource attributes one is lower and one is normal.
// for all operators other then like/contains we will use normal index
// for like/contains we will use lower index
// we can use lower index for =, in etc but it's difficult to do it for !=, NIN etc
// if as x != "ABC" we cannot predict something like "not lower(labels) like '%%x%%abc%%'". It has it be "not lower(labels) like '%%x%%ABC%%'"
func buildResourceIndexFilter(key string, op v3.FilterOperator, value interface{}) string {
	// not using clickhouseFormattedValue as we don't wan't the quotes
	strVal := fmt.Sprintf("%s", value)
	fmtValEscapedForContains := utils.QuoteEscapedStringForContains(strVal, true)
	fmtValEscapedForContainsLower := strings.ToLower(fmtValEscapedForContains)
	fmtValEscapedLower := strings.ToLower(utils.QuoteEscapedString(strVal))

	// add index filters
	switch op {
	case v3.FilterOperatorContains:
		return fmt.Sprintf("lower(labels) like '%%%s%%%s%%'", key, fmtValEscapedForContainsLower)
	case v3.FilterOperatorNotContains:
		return fmt.Sprintf("lower(labels) not like '%%%s%%%s%%'", key, fmtValEscapedForContainsLower)
	case v3.FilterOperatorLike:
		return fmt.Sprintf("lower(labels) like '%%%s%%%s%%'", key, fmtValEscapedLower)
	case v3.FilterOperatorNotLike:
		return fmt.Sprintf("lower(labels) not like '%%%s%%%s%%'", key, fmtValEscapedLower)
	case v3.FilterOperatorEqual:
		return fmt.Sprintf("labels like '%%%s%%%s%%'", key, fmtValEscapedForContains)
	case v3.FilterOperatorNotEqual:
		return fmt.Sprintf("labels not like '%%%s%%%s%%'", key, fmtValEscapedForContains)
	case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex:
		// don't try to do anything for regex.
		return ""
	case v3.FilterOperatorIn, v3.FilterOperatorNotIn:
		return buildIndexFilterForInOperator(key, op, value)
	default:
		return fmt.Sprintf("labels like '%%%s%%'", key)
	}
}

// buildResourceFiltersFromFilterItems builds a list of clickhouse filter strings for resource labels from a FilterSet.
// It skips any filter items that are not resource attributes and checks that the operator is supported and the data type is correct.
func buildResourceFiltersFromFilterItems(fs *v3.FilterSet) ([]string, error) {
	var conditions []string
	if fs == nil || len(fs.Items) == 0 {
		return nil, nil
	}
	for _, item := range fs.Items {
		// skip anything other than resource attribute
		if item.Key.Type != v3.AttributeKeyTypeResource {
			continue
		}

		// since out map is in lower case we are converting it to lowercase
		operatorLower := strings.ToLower(string(item.Operator))
		op := v3.FilterOperator(operatorLower)
		keyName := item.Key.Key

		// resource filter value data type will always be string
		// will be an interface if the operator is IN or NOT IN
		if item.Key.DataType != v3.AttributeKeyDataTypeString &&
			(op != v3.FilterOperatorIn && op != v3.FilterOperatorNotIn) {
			return nil, fmt.Errorf("invalid data type for resource attribute: %s", item.Key.Key)
		}

		var value interface{}
		var err error
		if op != v3.FilterOperatorExists && op != v3.FilterOperatorNotExists {
			// make sure to cast the value regardless of the actual type
			value, err = utils.ValidateAndCastValue(item.Value, item.Key.DataType)
			if err != nil {
				return nil, fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
			}
		}

		if logsOp, ok := resourceLogOperators[op]; ok {
			// the filter
			if resourceFilter := buildResourceFilter(logsOp, keyName, op, value); resourceFilter != "" {
				conditions = append(conditions, resourceFilter)
			}
			// the additional filter for better usage of the index
			if resourceIndexFilter := buildResourceIndexFilter(keyName, op, value); resourceIndexFilter != "" {
				conditions = append(conditions, resourceIndexFilter)
			}
		} else {
			return nil, fmt.Errorf("unsupported operator: %s", op)
		}

	}

	return conditions, nil
}

func buildResourceFiltersFromGroupBy(groupBy []v3.AttributeKey) []string {
	var conditions []string

	for _, attr := range groupBy {
		if attr.Type != v3.AttributeKeyTypeResource {
			continue
		}
		conditions = append(conditions, fmt.Sprintf("(simpleJSONHas(labels, '%s') AND labels like '%%%s%%')", attr.Key, attr.Key))
	}
	return conditions
}

func buildResourceFiltersFromAggregateAttribute(aggregateAttribute v3.AttributeKey) string {
	if aggregateAttribute.Key != "" && aggregateAttribute.Type == v3.AttributeKeyTypeResource {
		return fmt.Sprintf("(simpleJSONHas(labels, '%s') AND labels like '%%%s%%')", aggregateAttribute.Key, aggregateAttribute.Key)
	}

	return ""
}

func BuildResourceSubQuery(dbName, tableName string, bucketStart, bucketEnd int64, fs *v3.FilterSet, groupBy []v3.AttributeKey, aggregateAttribute v3.AttributeKey, isLiveTail bool) (string, error) {

	// BUILD THE WHERE CLAUSE
	var conditions []string
	// only add the resource attributes to the filters here
	rs, err := buildResourceFiltersFromFilterItems(fs)
	if err != nil {
		return "", err
	}
	conditions = append(conditions, rs...)

	// for aggregate attribute add exists check in resources
	aggregateAttributeResourceFilter := buildResourceFiltersFromAggregateAttribute(aggregateAttribute)
	if aggregateAttributeResourceFilter != "" {
		conditions = append(conditions, aggregateAttributeResourceFilter)
	}

	groupByResourceFilters := buildResourceFiltersFromGroupBy(groupBy)
	if len(groupByResourceFilters) > 0 {
		// TODO: change AND to OR once we know how to solve for group by ( i.e show values if one is not present)
		groupByStr := "( " + strings.Join(groupByResourceFilters, " AND ") + " )"
		conditions = append(conditions, groupByStr)
	}
	if len(conditions) == 0 {
		return "", nil
	}
	conditionStr := strings.Join(conditions, " AND ")

	// BUILD THE FINAL QUERY
	var query string
	if isLiveTail {
		query = fmt.Sprintf("SELECT fingerprint FROM %s.%s WHERE ", dbName, tableName)
		query = "(" + query + conditionStr
	} else {
		query = fmt.Sprintf("SELECT fingerprint FROM %s.%s WHERE (seen_at_ts_bucket_start >= %d) AND (seen_at_ts_bucket_start <= %d) AND ", dbName, tableName, bucketStart, bucketEnd)
		query = "(" + query + conditionStr + ")"
	}

	return query, nil
}
