package v3

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	. "github.com/smartystreets/goconvey/convey"
)

var buildFilterQueryData = []struct {
	Name           string
	FilterSet      *v3.FilterSet
	ExpectedFilter string
}{
	{
		Name: "Test attribute and resource attribute",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "john", Operator: "="},
			{Key: v3.AttributeKey{Key: "k8s_namespace", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "my_service", Operator: "!="},
		}},
		ExpectedFilter: " AND stringTagMap['user.name'] = 'john' AND resourceTagsMap['k8s_namespace'] != 'my_service'",
	},
	{
		Name: "Test fixed column",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "john", Operator: "="},
			{Key: v3.AttributeKey{Key: "k8s_namespace", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "my_service", Operator: "!="},
		}},
		ExpectedFilter: " AND user.name = 'john' AND resourceTagsMap['k8s_namespace'] != 'my_service'",
	},
	{
		Name: "Test fixed column with empty value",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "", Operator: "="},
			{Key: v3.AttributeKey{Key: "k8s_namespace", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "my_service", Operator: "!="},
		}},
		ExpectedFilter: " AND user.name = '' AND resourceTagsMap['k8s_namespace'] != 'my_service'",
	},
	{
		Name: "Test like",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.%", Operator: "like"},
		}},
		ExpectedFilter: " AND stringTagMap['host'] ILIKE '102.%'",
	},
	{
		Name: "Test IN",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag}, Value: []interface{}{1, 2, 3, 4}, Operator: "in"},
		}},
		ExpectedFilter: " AND numberTagMap['bytes'] IN [1,2,3,4]",
	},
	{
		Name: "Test DataType int64",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: ">"},
		}},
		ExpectedFilter: " AND numberTagMap['bytes'] > 10",
	},
	{
		Name: "Test NOT IN",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []interface{}{"john", "bunny"}, Operator: "nin"},
		}},
		ExpectedFilter: " AND stringTagMap['name'] NOT IN ['john','bunny']",
	},
	{
		Name: "Test exists",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "", Operator: "exists"},
		}},
		ExpectedFilter: " AND has(stringTagMap, 'bytes')",
	},
	{
		Name: "Test exists with fixed column",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "", Operator: "exists"},
		}},
		ExpectedFilter: " AND name != ''",
	},
	{
		Name: "Test not exists",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "", Operator: "nexists"},
		}},
		ExpectedFilter: " AND NOT has(stringTagMap, 'bytes')",
	},
	{
		Name: "Test not exists with fixed column",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "", Operator: "nexists"},
		}},
		ExpectedFilter: " AND name = ''",
	},
	{
		Name: "Test contains",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.", Operator: "contains"},
		}},
		ExpectedFilter: " AND stringTagMap['host'] ILIKE '%102.%'",
	},
	{
		Name: "Test contains with quotes",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "message", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "Hello 'world'", Operator: "contains"},
		}},
		ExpectedFilter: " AND stringTagMap['message'] ILIKE '%Hello \\'world\\'%'",
	},
	{
		Name: "Test not contains",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.", Operator: "ncontains"},
		}},
		ExpectedFilter: " AND stringTagMap['host'] NOT ILIKE '%102.%'",
	},
	{
		Name: "Test regex",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "name: \"(?P<host>\\S+)\"", Operator: "regex"},
		}},
		ExpectedFilter: " AND match(name, 'name: \"(?P<host>\\\\S+)\"')",
	},
	{
		Name: "Test not regex",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.", Operator: "nregex"},
		}},
		ExpectedFilter: " AND NOT match(stringTagMap['name'], '102.')",
	},
}

func TestBuildTracesFilterQuery(t *testing.T) {
	for _, tt := range buildFilterQueryData {
		Convey("TestBuildTracesFilterQuery", t, func() {
			query, err := buildTracesFilterQuery(tt.FilterSet)
			So(err, ShouldBeNil)
			So(query, ShouldEqual, tt.ExpectedFilter)
		})
	}
}

var handleEmptyValuesInGroupByData = []struct {
	Name           string
	GroupBy        []v3.AttributeKey
	ExpectedFilter string
}{
	{
		Name:           "String type key",
		GroupBy:        []v3.AttributeKey{{Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		ExpectedFilter: " AND has(stringTagMap, 'bytes')",
	},
	{
		Name:           "fixed column type key",
		GroupBy:        []v3.AttributeKey{{Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}},
		ExpectedFilter: "",
	},
	{
		Name: "String, float64 and fixed column type key",
		GroupBy: []v3.AttributeKey{
			{Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			{Key: "count", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		},
		ExpectedFilter: " AND has(stringTagMap, 'bytes') AND has(numberTagMap, 'count')",
	},
}

func TestBuildTracesHandleEmptyValuesInGroupBy(t *testing.T) {
	for _, tt := range handleEmptyValuesInGroupByData {
		Convey("TestBuildTracesHandleEmptyValuesInGroupBy", t, func() {
			query, err := handleEmptyValuesInGroupBy(tt.GroupBy)
			So(err, ShouldBeNil)
			So(query, ShouldEqual, tt.ExpectedFilter)
		})
	}
}

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

func TestColumnName(t *testing.T) {
	for _, tt := range testColumnName {
		tt.AttributeKey = enrichKeyWithMetadata(tt.AttributeKey, map[string]v3.AttributeKey{})
		Convey("testColumnName", t, func() {
			Column := getColumnName(tt.AttributeKey)
			So(Column, ShouldEqual, tt.ExpectedColumn)
		})
	}
}

var testGetSelectLabelsData = []struct {
	Name              string
	AggregateOperator v3.AggregateOperator
	GroupByTags       []v3.AttributeKey
	SelectLabels      string
}{
	{
		Name:              "select keys for groupBy attribute",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		SelectLabels:      " stringTagMap['user.name'] as `user.name`,",
	},
	{
		Name:              "select keys for groupBy resource",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}},
		SelectLabels:      " resourceTagsMap['user.name'] as `user.name`,",
	},
	{
		Name:              "select keys for groupBy attribute and resource",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags: []v3.AttributeKey{
			{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
			{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
		},
		SelectLabels: " resourceTagsMap['user.name'] as `user.name`, stringTagMap['host'] as `host`,",
	},
	{
		Name:              "select keys for groupBy fixed columns",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "host", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		SelectLabels:      " host as `host`,",
	},
}

func TestGetSelectLabels(t *testing.T) {
	for _, tt := range testGetSelectLabelsData {
		Convey("testGetSelectLabelsData", t, func() {
			selectLabels := getSelectLabels(tt.AggregateOperator, tt.GroupByTags)
			So(selectLabels, ShouldEqual, tt.SelectLabels)
		})
	}
}

var testGetSelectColumnsData = []struct {
	Name          string
	sc            []v3.AttributeKey
	SelectColumns string
}{
	{
		Name:          "select columns attribute",
		sc:            []v3.AttributeKey{{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		SelectColumns: "stringTagMap['user.name'] as `user.name` ",
	},
	{
		Name:          "select columns resource",
		sc:            []v3.AttributeKey{{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}},
		SelectColumns: "resourceTagsMap['user.name'] as `user.name` ",
	},
	{
		Name: "select columns attribute and resource",
		sc: []v3.AttributeKey{
			{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
			{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
		},
		SelectColumns: "resourceTagsMap['user.name'] as `user.name` ,stringTagMap['host'] as `host` ",
	},
	{
		Name:          "select columns fixed column",
		sc:            []v3.AttributeKey{{Key: "host", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		SelectColumns: "host as `host` ",
	},
}

func TestGetSelectColumns(t *testing.T) {
	for _, tt := range testGetSelectColumnsData {
		Convey("testGetSelectColumnsData", t, func() {
			selectColumns := getSelectColumns(tt.sc)
			So(selectColumns, ShouldEqual, tt.SelectColumns)
		})
	}
}

var testGetZerosForEpochNanoData = []struct {
	Name       string
	Epoch      int64
	Multiplier int64
	Result     int64
}{
	{
		Name:       "Test 1",
		Epoch:      1680712080000,
		Multiplier: 1000000,
		Result:     1680712080000000000,
	},
	{
		Name:       "Test 2",
		Epoch:      1680712080000000000,
		Multiplier: 1,
		Result:     1680712080000000000,
	},
}

func TestGetZerosForEpochNano(t *testing.T) {
	for _, tt := range testGetZerosForEpochNanoData {
		Convey("testGetZerosForEpochNanoData", t, func() {
			multiplier := getZerosForEpochNano(tt.Epoch)
			So(multiplier, ShouldEqual, tt.Multiplier)
			So(tt.Epoch*multiplier, ShouldEqual, tt.Result)
		})
	}
}

var testOrderBy = []struct {
	Name      string
	PanelType v3.PanelType
	Items     []v3.OrderBy
	Tags      []v3.AttributeKey
	Result    string
}{
	{
		Name:      "Test 1",
		PanelType: v3.PanelTypeGraph,
		Items: []v3.OrderBy{
			{
				ColumnName: "name",
				Order:      "asc",
			},
			{
				ColumnName: constants.SigNozOrderByValue,
				Order:      "desc",
			},
		},
		Tags: []v3.AttributeKey{
			{Key: "name"},
		},
		Result: "`name` asc,value desc",
	},
	{
		Name:      "Test 2",
		PanelType: v3.PanelTypeList,
		Items: []v3.OrderBy{
			{
				ColumnName: "name",
				Order:      "asc",
			},
			{
				ColumnName: "bytes",
				Order:      "asc",
			},
		},
		Tags: []v3.AttributeKey{
			{Key: "name"},
			{Key: "bytes"},
		},
		Result: "`name` asc,`bytes` asc",
	},
	{
		Name:      "Test 3",
		PanelType: v3.PanelTypeList,
		Items: []v3.OrderBy{
			{
				ColumnName: "name",
				Order:      "asc",
			},
			{
				ColumnName: constants.SigNozOrderByValue,
				Order:      "asc",
			},
			{
				ColumnName: "bytes",
				Order:      "asc",
			},
		},
		Tags: []v3.AttributeKey{
			{Key: "name"},
			{Key: "bytes"},
		},
		Result: "`name` asc,value asc,`bytes` asc",
	},
	{
		Name:      "Test 4",
		PanelType: v3.PanelTypeList,
		Items: []v3.OrderBy{
			{
				ColumnName: "name",
				Order:      "asc",
			},
			{
				ColumnName: "bytes",
				Order:      "asc",
			},
			{
				ColumnName: "response_time",
				Order:      "desc",
				Key:        "response_time",
				Type:       v3.AttributeKeyTypeTag,
				DataType:   v3.AttributeKeyDataTypeString,
			},
		},
		Tags: []v3.AttributeKey{
			{Key: "name"},
			{Key: "bytes"},
		},
		Result: "`name` asc,`bytes` asc,stringTagMap['response_time'] desc",
	},
	{
		Name:      "Test 5",
		PanelType: v3.PanelTypeList,
		Items: []v3.OrderBy{
			{
				ColumnName: "name",
				Order:      "asc",
				Key:        "name",
				Type:       v3.AttributeKeyTypeTag,
				DataType:   v3.AttributeKeyDataTypeString,
				IsColumn:   true,
			},
			{
				ColumnName: "bytes",
				Order:      "asc",
				Key:        "bytes",
				Type:       v3.AttributeKeyTypeTag,
				DataType:   v3.AttributeKeyDataTypeString,
				IsColumn:   true,
			},
			{
				ColumnName: "response_time",
				Order:      "desc",
			},
		},
		Tags:   []v3.AttributeKey{},
		Result: "`name` asc,`bytes` asc,stringTagMap['response_time'] desc",
	},
}

func TestOrderBy(t *testing.T) {
	keys := map[string]v3.AttributeKey{
		"name":          {Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		"bytes":         {Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		"response_time": {Key: "response_time", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: false},
	}
	for _, tt := range testOrderBy {
		Convey("testOrderBy", t, func() {
			tt.Items = enrichOrderBy(tt.Items, keys)
			res := orderByAttributeKeyTags(tt.PanelType, tt.Items, tt.Tags)
			So(res, ShouldResemble, tt.Result)
		})
	}
}
