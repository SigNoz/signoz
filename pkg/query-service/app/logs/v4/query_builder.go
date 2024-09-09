package v4

import (
	"fmt"
	"strings"

	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
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
	BODY                         = "body"
	DISTRIBUTED_LOGS_V2          = "distributed_logs_v2"
	DISTRIBUTED_LOGS_V2_RESOURCE = "distributed_logs_v2_resource"
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
		// no exists filter for static fields as they exists everywhere
		// TODO(nitya): Think what we can do here
		return ""
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
			val := utils.QuoteEscapedStringForContains(fmt.Sprintf("%s", item.Value))
			// for body the contains is case insensitive
			if keyName == BODY {
				return fmt.Sprintf("lower(%s) %s lower('%%%s%%')", keyName, logsOp, val), nil
			} else {
				return fmt.Sprintf("%s %s '%%%s%%'", keyName, logsOp, val), nil
			}
		default:
			// for use lower for like and ilike
			if op == v3.FilterOperatorLike || op == v3.FilterOperatorNotLike {
				if keyName == BODY {
					keyName = fmt.Sprintf("lower(%s)", keyName)
					fmtVal = fmt.Sprintf("lower(%s)", fmtVal)
				}
			}
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
