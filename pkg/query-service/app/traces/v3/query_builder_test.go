package v3

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
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
		Name: "Test not contains",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "102.", Operator: "ncontains"},
		}},
		ExpectedFilter: " AND stringTagMap['host'] NOT ILIKE '%102.%'",
	},
}

func TestBuildTracesFilterQuery(t *testing.T) {
	for _, tt := range buildFilterQueryData {
		Convey("TestBuildTracesFilterQuery", t, func() {
			query, err := buildTracesFilterQuery(tt.FilterSet, map[string]v3.AttributeKey{})
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
			query, err := handleEmptyValuesInGroupBy(map[string]v3.AttributeKey{}, tt.GroupBy)
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
		Convey("testColumnName", t, func() {
			Column := getColumnName(tt.AttributeKey, map[string]v3.AttributeKey{})
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
		SelectLabels:      ", stringTagMap['user.name'] as `user.name`",
	},
	{
		Name:              "select keys for groupBy resource",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}},
		SelectLabels:      ", resourceTagsMap['user.name'] as `user.name`",
	},
	{
		Name:              "select keys for groupBy attribute and resource",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags: []v3.AttributeKey{
			{Key: "user.name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
			{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
		},
		SelectLabels: ", resourceTagsMap['user.name'] as `user.name`, stringTagMap['host'] as `host`",
	},
	{
		Name:              "select keys for groupBy fixed columns",
		AggregateOperator: v3.AggregateOperatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "host", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		SelectLabels:      ", host as `host`",
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

var testBuildTracesQueryData = []struct {
	Name              string
	Start             int64
	End               int64
	Step              int64
	BuilderQuery      *v3.BuilderQuery
	GroupByTags       []v3.AttributeKey
	TableName         string
	AggregateOperator v3.AggregateOperator
	ExpectedQuery     string
}{
	{
		Name:  "Test aggregate count on fixed column of float64 type",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
			AggregateAttribute: v3.AttributeKey{Key: "durationNano", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" group by ts order by ts",
	},
	{
		Name:  "Test aggregate rate without aggregate attribute",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:         "A",
			AggregateOperator: v3.AggregateOperatorRate,
			Expression:        "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, count()/60 as value from" +
			" signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <=" +
			" '1680066458000000000') group by ts order by ts",
	},
	{
		Name:  "Test aggregate count on fixed column of float64 type with filter",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
			AggregateAttribute: v3.AttributeKey{Key: "durationNano", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{{Key: v3.AttributeKey{Key: "customer_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "10001", Operator: "="}}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2" +
			" where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND stringTagMap['customer_id'] = '10001' group by ts order by ts",
	},
	{
		Name:  "Test aggregate count on fixed column of bool type",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
			AggregateAttribute: v3.AttributeKey{Key: "hasError", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" group by ts order by ts",
	},
	{
		Name:  "Test aggregate count on a attribute",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND has(stringTagMap, 'user_name') group by ts order by ts",
	},
	{
		Name:  "Test aggregate count on a fixed column of string type",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND name != '' group by ts order by ts",
	},
	{
		Name:  "Test aggregate count with filter",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCount,
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag}, Value: 100, Operator: ">"},
			}},
			Expression: "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND numberTagMap['bytes'] > 100.000000 AND has(stringTagMap, 'user_name') group by ts order by ts",
	},
	{
		Name:  "Test aggregate count distinct and order by value",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			OrderBy:            []v3.OrderBy{{ColumnName: "#SIGNOZ_VALUE", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count(distinct(name))) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" group by ts order by value ASC,ts",
	},
	{
		Name:  "Test aggregate count distinct on string key",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count(distinct(stringTagMap['name'])))" +
			" as value from signoz_traces.distributed_signoz_index_v2 where" +
			" (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') group by ts order by ts",
	},
	{
		Name:  "Test aggregate count distinct with filter and groupBy",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
				{Key: v3.AttributeKey{Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "abc", Operator: "!="},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "http.method", Order: "ASC"}, {ColumnName: "ts", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" stringTagMap['http.method'] as `http.method`, " +
			"toFloat64(count(distinct(name))) as value from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['http.method'] = 'GET' AND resourceTagsMap['x'] != 'abc' " +
			"AND has(stringTagMap, 'http.method') group by http.method,ts " +
			"order by http.method ASC,ts",
	},
	{
		Name:  "Test aggregate count with multiple filter,groupBy and orderBy",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
				{Key: v3.AttributeKey{Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "abc", Operator: "!="},
			},
			},
			GroupBy: []v3.AttributeKey{
				{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
				{Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
			},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}, {ColumnName: "x", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" stringTagMap['method'] as `method`, " +
			"resourceTagsMap['x'] as `x`, " +
			"toFloat64(count(distinct(name))) as value from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['method'] = 'GET' AND resourceTagsMap['x'] != 'abc' " +
			"AND has(stringTagMap, 'method') AND has(resourceTagsMap, 'x') group by method,x,ts " +
			"order by method ASC,x ASC,ts",
	},
	{
		Name:  "Test aggregate avg",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorAvg,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}, {ColumnName: "x", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" stringTagMap['method'] as `method`, " +
			"avg(numberTagMap['bytes']) as value " +
			"from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['method'] = 'GET' " +
			"AND has(stringTagMap, 'method') group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate sum",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorSum,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" stringTagMap['method'] as `method`, " +
			"sum(bytes) as value " +
			"from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['method'] = 'GET' " +
			"AND has(stringTagMap, 'method') group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate min",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorMin,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" stringTagMap['method'] as `method`, " +
			"min(bytes) as value " +
			"from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['method'] = 'GET' " +
			"AND has(stringTagMap, 'method') group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate max",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorMax,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" stringTagMap['method'] as `method`, " +
			"max(bytes) as value " +
			"from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['method'] = 'GET' " +
			"AND has(stringTagMap, 'method') group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate PXX",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorP05,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" stringTagMap['method'] as `method`, " +
			"quantile(0.05)(bytes) as value " +
			"from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND has(stringTagMap, 'method') group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate RateSum",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorRateSum,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, stringTagMap['method'] as `method`" +
			", sum(bytes)/60 as value from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND has(stringTagMap, 'method') group by method,ts order by method ASC,ts",
	},
	{
		Name:  "Test aggregate rate",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeFloat64},
			AggregateOperator:  v3.AggregateOperatorRate,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, stringTagMap['method'] as `method`" +
			", count(numberTagMap['bytes'])/60 as value " +
			"from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND has(stringTagMap, 'method') group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate RateSum without fixed column",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeFloat64},
			AggregateOperator:  v3.AggregateOperatorRateSum,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, " +
			"stringTagMap['method'] as `method`, " +
			"sum(numberTagMap['bytes'])/60 as value " +
			"from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND has(stringTagMap, 'method') group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate with having clause",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Having: []v3.Having{
				{
					ColumnName: "name",
					Operator:   ">",
					Value:      10,
				},
			},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count(distinct(stringTagMap['name']))) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" group by ts having value > 10 order by ts",
	},
	{
		Name:  "Test count aggregate with having clause and filters",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			Having: []v3.Having{
				{
					ColumnName: "name",
					Operator:   ">",
					Value:      10,
				},
			},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value from " +
			"signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['method'] = 'GET' AND has(stringTagMap, 'name') group by ts having value > 10 order by ts",
	},
	{
		Name:  "Test count distinct aggregate with having clause and filters",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			Having: []v3.Having{
				{
					ColumnName: "name",
					Operator:   ">",
					Value:      10,
				},
			},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count(distinct(stringTagMap['name']))) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['method'] = 'GET' group by ts having value > 10 order by ts",
	},
	// {
	// 	Name:  "Test Noop",
	// 	Start: 1680066360726210000,
	// 	End:   1680066458000000000,
	// 	Step:  60,
	// 	BuilderQuery: &v3.BuilderQuery{
	// 		SelectColumns:     []v3.AttributeKey{},
	// 		QueryName:         "A",
	// 		AggregateOperator: v3.AggregateOperatorNoOp,
	// 		Expression:        "A",
	// 		Filters:           &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
	// 		// GroupBy:           []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
	// 		// OrderBy:           []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
	// 	},
	// 	ExpectedQuery: "",
	// },
}

func TestBuildTracesQuery(t *testing.T) {
	for _, tt := range testBuildTracesQueryData {
		Convey("TestBuildTracesQuery", t, func() {
			query, err := buildTracesQuery(tt.Start, tt.End, tt.Step, tt.BuilderQuery, tt.TableName, map[string]v3.AttributeKey{})
			So(err, ShouldBeNil)
			So(query, ShouldEqual, tt.ExpectedQuery)

		})
	}
}
