package queryBuilderToExpr

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var testCases = []struct {
	Name        string
	Query       *v3.FilterSet
	Expr        string
	ExpectError bool
}{
	{
		Name: "equal",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "checkbody", Operator: "="},
		}},
		Expr: `attributes["key"] == "checkbody"`,
	},
	{
		Name: "not equal",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "checkbody", Operator: "!="},
		}},
		Expr: `attributes["key"] != "checkbody"`,
	},
	{
		Name: "less than",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: "<"},
		}},
		Expr: `attributes["key"] != nil && attributes["key"] < 10`,
	},
	{
		Name: "greater than",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: ">"},
		}},
		Expr: `attributes["key"] != nil && attributes["key"] > 10`,
	},
	{
		Name: "less than equal",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: "<="},
		}},
		Expr: `attributes["key"] != nil && attributes["key"] <= 10`,
	},
	{
		Name: "greater than equal",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: ">="},
		}},
		Expr: `attributes["key"] != nil && attributes["key"] >= 10`,
	},
	// case sensitive
	{
		Name: "body contains",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "checkbody", Operator: "contains"},
		}},
		Expr: `body != nil && lower(body) contains lower("checkbody")`,
	},
	{
		Name: "body ncontains",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "checkbody", Operator: "ncontains"},
		}},
		Expr: `body != nil && lower(body) not contains lower("checkbody")`,
	},
	{
		Name: "body regex",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex$", Operator: "regex"},
		}},
		Expr: `body != nil && body matches "[0-1]+regex$"`,
	},
	{
		Name: "body not regex",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex$", Operator: "nregex"},
		}},
		Expr: `body != nil && body not matches "[0-1]+regex$"`,
	},
	{
		Name: "regex with escape characters",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: `^Executing \[\S+@\S+:[0-9]+\] \S+".*`, Operator: "regex"},
		}},
		Expr: `body != nil && body matches "^Executing \\[\\S+@\\S+:[0-9]+\\] \\S+\".*"`,
	},
	{
		Name: "invalid regex",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-9]++", Operator: "nregex"},
		}},
		Expr:        `body != nil && lower(body) not matches "[0-9]++"`,
		ExpectError: true,
	},
	{
		Name: "in",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []interface{}{1, 2, 3, 4}, Operator: "in"},
		}},
		Expr: `attributes["key"] != nil && attributes["key"] in [1,2,3,4]`,
	},
	{
		Name: "not in",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []interface{}{"1", "2"}, Operator: "nin"},
		}},
		Expr: `attributes["key"] != nil && attributes["key"] not in ['1','2']`,
	},
	{
		Name: "exists",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "exists"},
		}},
		Expr: `"key" in attributes`,
	},
	{
		Name: "not exists",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "nexists"},
		}},
		Expr: `"key" not in attributes`,
	},
	{
		Name: "Multi filter",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: "<="},
			{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex$", Operator: "nregex"},
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "nexists"},
		}},
		Expr: `attributes["key"] != nil && attributes["key"] <= 10 and body != nil && body not matches "[0-1]+regex$" and "key" not in attributes`,
	},
	{
		Name: "incorrect multi filter",
		Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: "<="},
			{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-9]++", Operator: "nregex"},
			{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "nexists"},
		}},
		Expr:        `attributes["key"] != nil && attributes["key"] <= 10 and body not matches "[0-9]++" and "key" not in attributes`,
		ExpectError: true,
	},
}

func TestParse(t *testing.T) {
	for _, tt := range testCases {
		Convey(tt.Name, t, func() {
			x, err := Parse(tt.Query)
			if tt.ExpectError {
				So(err, ShouldNotBeNil)
			} else {
				So(err, ShouldBeNil)
				So(x, ShouldEqual, tt.Expr)
			}
		})
	}
}
