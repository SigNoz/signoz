package v4

import (
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var testColumnName = []struct {
	Name           string
	AttributeKey   v3.AttributeKey
	ExpectedColumn string
}{
	{
		Name:           "resource",
		AttributeKey:   v3.AttributeKey{Key: "collector_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource, IsColumn: false},
		ExpectedColumn: "resourceTagsMap['collector_id']",
	},
	{
		Name:           "stringAttribute",
		AttributeKey:   v3.AttributeKey{Key: "customer_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedColumn: "stringTagMap['customer_id']",
	},
	{
		Name:           "boolAttribute",
		AttributeKey:   v3.AttributeKey{Key: "has_error", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedColumn: "boolTagMap['has_error']",
	},
	{
		Name:           "float64Attribute",
		AttributeKey:   v3.AttributeKey{Key: "count", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedColumn: "numberTagMap['count']",
	},
	{
		Name:           "int64Attribute",
		AttributeKey:   v3.AttributeKey{Key: "count", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedColumn: "numberTagMap['count']",
	},
	{
		Name:           "column",
		AttributeKey:   v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		ExpectedColumn: "name",
	},
	{
		Name:           "missing key",
		AttributeKey:   v3.AttributeKey{Key: "xyz"},
		ExpectedColumn: "stringTagMap['xyz']",
	},
}

// func TestColumnName(t *testing.T) {
// 	for _, tt := range testColumnName {
// 		tt.AttributeKey = enrichKeyWithMetadata(tt.AttributeKey, map[string]v3.AttributeKey{})
// 		Convey("testColumnName", t, func() {
// 			Column := getColumnName(tt.AttributeKey)
// 			So(Column, ShouldEqual, tt.ExpectedColumn)
// 		})
// 	}
// }
