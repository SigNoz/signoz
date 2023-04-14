package v3

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var timeSeriesFilterQueryData = []struct {
	Name           string
	FilterSet      *v3.FilterSet
	ExpectedFilter string
}{
	{
		Name: "Test attribute and resource attribute",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "john", Operator: "="},
			{Key: v3.AttributeKey{Key: "k8s_namespace", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "my_service", Operator: "!="},
		}},
		ExpectedFilter: " AND stringTagMap['user_name'] = 'john' AND resourceTagsMap['k8s_namespace'] != 'my_service'",
	},
	{
		Name: "Test materialized column",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "john", Operator: "="},
			{Key: v3.AttributeKey{Key: "k8s_namespace", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "my_service", Operator: "!="},
		}},
		ExpectedFilter: " AND user_name = 'john' AND resourceTagsMap['k8s_namespace'] != 'my_service'",
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
		ExpectedFilter: " AND stringTagMap['bytes'] IS NOT NULL ",
	},
	{
		Name: "Test not exists",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "", Operator: "nexists"},
		}},
		ExpectedFilter: " AND stringTagMap['bytes'] IS NULL ",
	},
	{
		Name: "Test contains",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.", Operator: "contains"},
		}},
		ExpectedFilter: " AND stringTagMap['host'] ILIKE '%102.%'",
	},
	{
		Name: "Test not contains",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.", Operator: "ncontains"},
		}},
		ExpectedFilter: " AND stringTagMap['host'] NOT ILIKE '%102.%'",
	},
}

func TestBuildLogsTimeSeriesFilterQuery(t *testing.T) {
	for _, tt := range timeSeriesFilterQueryData {
		Convey("TestBuildLogsTimeSeriesFilterQuery", t, func() {
			query, err := buildTracesFilterQuery(tt.FilterSet, map[string]v3.AttributeKey{})
			So(err, ShouldBeNil)
			So(query, ShouldEqual, tt.ExpectedFilter)
		})
	}
}

var testGetFilter = []struct {
	Name           string
	AttributeKey   v3.AttributeKey
	ExpectedFilter string
}{
	{
		Name:           "resource",
		AttributeKey:   v3.AttributeKey{Key: "collector_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource, IsColumn: false},
		ExpectedFilter: "resourceTagsMap['collector_id']",
	},
	{
		Name:           "stringAttribute",
		AttributeKey:   v3.AttributeKey{Key: "customer_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedFilter: "stringTagMap['customer_id']",
	},
	{
		Name:           "boolAttribute",
		AttributeKey:   v3.AttributeKey{Key: "has_error", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedFilter: "boolTagMap['has_error']",
	},
	{
		Name:           "float64Attribute",
		AttributeKey:   v3.AttributeKey{Key: "count", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedFilter: "numberTagMap['count']",
	},
	{
		Name:           "int64Attribute",
		AttributeKey:   v3.AttributeKey{Key: "count", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedFilter: "numberTagMap['count']",
	},
	{
		Name:           "column",
		AttributeKey:   v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		ExpectedFilter: "name",
	},
}

func TestGetFilter(t *testing.T) {
	for _, tt := range testGetFilter {
		Convey("testGetFilter", t, func() {
			Filter, err := getColumnName(tt.AttributeKey, map[string]v3.AttributeKey{})
			So(err, ShouldBeNil)
			So(Filter, ShouldEqual, tt.ExpectedFilter)
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
		Name:              "select fields for groupBy attribute",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		SelectLabels:      ", stringTagMap['user_name'] as user_name",
	},
	{
		Name:              "select fields for groupBy resource",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}},
		SelectLabels:      ", resourceTagsMap['user_name'] as user_name",
	},
	{
		Name:              "select fields for groupBy attribute and resource",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags: []v3.AttributeKey{
			{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
			{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
		},
		SelectLabels: ", resourceTagsMap['user_name'] as user_name, stringTagMap['host'] as host",
	},
	{
		Name:              "select fields for groupBy materialized columns",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "host", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		SelectLabels:      ", host as host",
	},
}

func TestGetSelectLabels(t *testing.T) {
	for _, tt := range testGetSelectLabelsData {
		Convey("testGetSelectLabelsData", t, func() {
			selectLabels, err := getSelectLabels(tt.AggregateOperator, tt.GroupByTags, map[string]v3.AttributeKey{})
			So(err, ShouldBeNil)
			So(selectLabels, ShouldEqual, tt.SelectLabels)
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
	Name   string
	Items  []v3.OrderBy
	Tags   []string
	Result string
}{
	{
		Name: "Test 1",
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
		Tags:   []string{"name"},
		Result: "name asc,value desc",
	},
	{
		Name: "Test 2",
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
		Tags:   []string{"name", "bytes"},
		Result: "name asc,bytes asc",
	},
	{
		Name: "Test 3",
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
		Tags:   []string{"name", "bytes"},
		Result: "name asc,bytes asc,value asc",
	},
}

func TestOrderBy(t *testing.T) {
	for _, tt := range testOrderBy {
		Convey("testOrderBy", t, func() {
			res := orderBy(tt.Items, tt.Tags)
			So(res, ShouldEqual, tt.Result)
		})
	}
}

