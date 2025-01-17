package v4

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var testGetJSONFilterData = []struct {
	Name       string
	FilterItem v3.FilterItem
	Filter     string
	Error      bool
}{
	{
		Name: "Array membership string",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.requestor_list[*]",
				DataType: "array(string)",
				IsJSON:   true,
			},
			Operator: "has",
			Value:    "index_service",
		},
		Filter: "lower(body) like lower('%requestor_list%') AND lower(body) like lower('%index_service%') AND has(JSONExtract(JSON_QUERY(body, '$.\"requestor_list\"[*]'), 'Array(String)'), 'index_service')",
	},
	{
		Name: "Array membership int64",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.int_numbers[*]",
				DataType: "array(int64)",
				IsJSON:   true,
			},
			Operator: "has",
			Value:    2,
		},
		Filter: "lower(body) like lower('%int_numbers%') AND has(JSONExtract(JSON_QUERY(body, '$.\"int_numbers\"[*]'), '" + logsV3.ARRAY_INT64 + "'), 2)",
	},
	{
		Name: "Array membership float64",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.nested_num[*].float_nums[*]",
				DataType: "array(float64)",
				IsJSON:   true,
			},
			Operator: "nhas",
			Value:    2.2,
		},
		Filter: "lower(body) like lower('%nested_num%float_nums%') AND NOT has(JSONExtract(JSON_QUERY(body, '$.\"nested_num\"[*].\"float_nums\"[*]'), '" + logsV3.ARRAY_FLOAT64 + "'), 2.200000)",
	},
	{
		Name: "Array membership bool",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.bool[*]",
				DataType: "array(bool)",
				IsJSON:   true,
			},
			Operator: "has",
			Value:    true,
		},
		Filter: "lower(body) like lower('%bool%') AND has(JSONExtract(JSON_QUERY(body, '$.\"bool\"[*]'), '" + logsV3.ARRAY_BOOL + "'), true)",
	},
	{
		Name: "eq operator",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.message",
				DataType: "string",
				IsJSON:   true,
			},
			Operator: "=",
			Value:    "hello",
		},
		Filter: "lower(body) like lower('%message%') AND lower(body) like lower('%hello%') AND JSON_EXISTS(body, '$.\"message\"') AND JSON_VALUE(body, '$.\"message\"') = 'hello'",
	},
	{
		Name: "eq operator number",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.status",
				DataType: "int64",
				IsJSON:   true,
			},
			Operator: "=",
			Value:    1,
		},
		Filter: "lower(body) like lower('%status%') AND JSON_EXISTS(body, '$.\"status\"') AND JSONExtract(JSON_VALUE(body, '$.\"status\"'), '" + logsV3.INT64 + "') = 1",
	},
	{
		Name: "neq operator number",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.status",
				DataType: "float64",
				IsJSON:   true,
			},
			Operator: "=",
			Value:    1.1,
		},
		Filter: "lower(body) like lower('%status%') AND JSON_EXISTS(body, '$.\"status\"') AND JSONExtract(JSON_VALUE(body, '$.\"status\"'), '" + logsV3.FLOAT64 + "') = 1.100000",
	},
	{
		Name: "eq operator bool",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.boolkey",
				DataType: "bool",
				IsJSON:   true,
			},
			Operator: "=",
			Value:    true,
		},
		Filter: "lower(body) like lower('%boolkey%') AND JSON_EXISTS(body, '$.\"boolkey\"') AND JSONExtract(JSON_VALUE(body, '$.\"boolkey\"'), '" + logsV3.BOOL + "') = true",
	},
	{
		Name: "greater than operator",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.status",
				DataType: "int64",
				IsJSON:   true,
			},
			Operator: ">",
			Value:    1,
		},
		Filter: "lower(body) like lower('%status%') AND JSON_EXISTS(body, '$.\"status\"') AND JSONExtract(JSON_VALUE(body, '$.\"status\"'), '" + logsV3.INT64 + "') > 1",
	},
	{
		Name: "regex operator",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.message",
				DataType: "string",
				IsJSON:   true,
			},
			Operator: "regex",
			Value:    "a*",
		},
		Filter: "lower(body) like lower('%message%') AND JSON_EXISTS(body, '$.\"message\"') AND match(JSON_VALUE(body, '$.\"message\"'), 'a*')",
	},
	{
		Name: "contains operator",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.message",
				DataType: "string",
				IsJSON:   true,
			},
			Operator: "contains",
			Value:    "a",
		},
		Filter: "lower(body) like lower('%message%') AND JSON_EXISTS(body, '$.\"message\"') AND JSON_VALUE(body, '$.\"message\"') LIKE '%a%'",
	},
	{
		Name: "contains operator with quotes",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.message",
				DataType: "string",
				IsJSON:   true,
			},
			Operator: "contains",
			Value:    "hello 'world'",
		},
		Filter: "lower(body) like lower('%message%') AND lower(body) like lower('%hello \\'world\\'%') AND JSON_EXISTS(body, '$.\"message\"') AND JSON_VALUE(body, '$.\"message\"') LIKE '%hello \\'world\\'%'",
	},
	{
		Name: "exists",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.message",
				DataType: "string",
				IsJSON:   true,
			},
			Operator: "exists",
			Value:    "",
		},
		Filter: "lower(body) like lower('%message%') AND JSON_EXISTS(body, '$.\"message\"')",
	},
	{
		Name: "test json in array string",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.name",
				DataType: "string",
				IsJSON:   true,
			},
			Operator: "in",
			Value:    []interface{}{"hello", "world"},
		},
		Filter: "lower(body) like lower('%name%') AND JSON_EXISTS(body, '$.\"name\"') AND JSON_VALUE(body, '$.\"name\"') IN ['hello','world']",
	},
	{
		Name: "test json in array number",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.value",
				DataType: "int64",
				IsJSON:   true,
			},
			Operator: "in",
			Value:    []interface{}{10, 11},
		},
		Filter: "lower(body) like lower('%value%') AND JSON_EXISTS(body, '$.\"value\"') AND JSONExtract(JSON_VALUE(body, '$.\"value\"'), 'Int64') IN [10,11]",
	},
	{
		Name: "test json in array mixed data- allow",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.value",
				DataType: "int64",
				IsJSON:   true,
			},
			Operator: "in",
			Value:    []interface{}{11, "11"},
		},
		Filter: "lower(body) like lower('%value%') AND JSON_EXISTS(body, '$.\"value\"') AND JSONExtract(JSON_VALUE(body, '$.\"value\"'), 'Int64') IN [11,11]",
	},
	{
		Name: "test json in array mixed data- fail",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.value",
				DataType: "int64",
				IsJSON:   true,
			},
			Operator: "in",
			Value:    []interface{}{11, "11", "hello"},
		},
		Error: true,
	},
	{
		Name: "test json in array mixed data- allow",
		FilterItem: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.value",
				DataType: "string",
				IsJSON:   true,
			},
			Operator: "in",
			Value:    []interface{}{"hello", 11},
		},
		Filter: "lower(body) like lower('%value%') AND JSON_EXISTS(body, '$.\"value\"') AND JSON_VALUE(body, '$.\"value\"') IN ['hello','11']",
	},
}

func TestGetJSONFilter(t *testing.T) {
	for _, tt := range testGetJSONFilterData {
		Convey("testGetJSONFilter", t, func() {
			filter, err := GetJSONFilter(tt.FilterItem)
			if tt.Error {
				So(err, ShouldNotBeNil)
			} else {
				So(err, ShouldBeNil)
				So(filter, ShouldEqual, tt.Filter)
			}
		})
	}
}
