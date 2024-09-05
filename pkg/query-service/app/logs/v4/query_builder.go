package v4

import (
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
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
