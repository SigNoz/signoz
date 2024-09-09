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
	return utils.GetClickhouseColumnNameV2(string(key.Type), string(key.DataType), key.Key)
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
