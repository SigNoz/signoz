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
	PanelType         v3.PanelType
	Options           v3.QBOptions
}{
	{
		Name:  "Test aggregate count on fixed column of float64 type",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
			AggregateAttribute: v3.AttributeKey{Key: "durationNano", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" group by ts order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate rate without aggregate attribute",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:         "A",
			StepInterval:      60,
			AggregateOperator: v3.AggregateOperatorRate,
			Expression:        "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, count()/1.000000 as value from" +
			" signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <=" +
			" '1680066458000000000') group by ts order by value DESC",
		PanelType: v3.PanelTypeGraph,
		Options:   v3.QBOptions{GraphLimitQtype: "", PreferRPM: true},
	},
	{
		Name:  "Test aggregate count on fixed column of float64 type with filter",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
			AggregateAttribute: v3.AttributeKey{Key: "durationNano", DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{{Key: v3.AttributeKey{Key: "customer_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "10001", Operator: "="}}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2" +
			" where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND stringTagMap['customer_id'] = '10001' group by ts order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate count on fixed column of bool type",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
			AggregateAttribute: v3.AttributeKey{Key: "hasError", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" group by ts order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate count on a attribute",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND has(stringTagMap, 'user_name') group by ts order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate count on a fixed column of string type",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorCount,
			Expression:         "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND name != '' group by ts order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate count with filter",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			" AND numberTagMap['bytes'] > 100.000000 AND has(stringTagMap, 'user_name') group by ts order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate count distinct and order by value",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			OrderBy:            []v3.OrderBy{{ColumnName: "#SIGNOZ_VALUE", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count(distinct(name))) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" group by ts order by value ASC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate count distinct on string key",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count(distinct(stringTagMap['name'])))" +
			" as value from signoz_traces.distributed_signoz_index_v2 where" +
			" (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') group by ts order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate count distinct with filter and groupBy",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true, DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
				{Key: v3.AttributeKey{Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "abc", Operator: "!="},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "http.method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts," +
			" stringTagMap['http.method'] as `http.method`, " +
			"toFloat64(count(distinct(name))) as value from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['http.method'] = 'GET' AND resourceTagsMap['x'] != 'abc' " +
			"AND has(stringTagMap, 'http.method') group by `http.method`,ts " +
			"order by `http.method` ASC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate count with multiple filter,groupBy and orderBy",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"AND has(stringTagMap, 'method') AND has(resourceTagsMap, 'x') group by `method`,`x`,ts " +
			"order by `method` ASC,`x` ASC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate avg",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"AND has(stringTagMap, 'method') group by `method`,ts " +
			"order by `method` ASC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate sum",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"AND has(stringTagMap, 'method') group by `method`,ts " +
			"order by `method` ASC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate min",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"AND has(stringTagMap, 'method') group by `method`,ts " +
			"order by `method` ASC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate max",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"AND has(stringTagMap, 'method') group by `method`,ts " +
			"order by `method` ASC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate PXX",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"AND has(stringTagMap, 'method') group by `method`,ts " +
			"order by `method` ASC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test aggregate RateSum",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorRateSum,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, stringTagMap['method'] as `method`" +
			", sum(bytes)/60.000000 as value from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			" AND has(stringTagMap, 'method') group by `method`,ts order by `method` ASC",
		PanelType: v3.PanelTypeGraph,
		Options: v3.QBOptions{GraphLimitQtype: "",
			PreferRPM: false,
		},
	},
	{
		Name:  "Test aggregate rate",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "bytes", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeFloat64},
			AggregateOperator:  v3.AggregateOperatorRate,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, stringTagMap['method'] as `method`" +
			", count(numberTagMap['bytes'])/1.000000 as value " +
			"from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND has(stringTagMap, 'method') group by `method`,ts " +
			"order by `method` ASC",
		PanelType: v3.PanelTypeGraph,
		Options:   v3.QBOptions{GraphLimitQtype: "", PreferRPM: true},
	},
	{
		Name:  "Test aggregate RateSum without fixed column",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"sum(numberTagMap['bytes'])/1.000000 as value " +
			"from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND has(stringTagMap, 'method') group by `method`,ts " +
			"order by `method` ASC",
		PanelType: v3.PanelTypeGraph,
		Options:   v3.QBOptions{GraphLimitQtype: "", PreferRPM: true},
	},
	{
		Name:  "Test aggregate with having clause",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			" group by ts having value > 10 order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test count aggregate with having clause and filters",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"AND stringTagMap['method'] = 'GET' AND has(stringTagMap, 'name') group by ts having value > 10 order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test count distinct aggregate with having clause and filters",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
			"AND stringTagMap['method'] = 'GET' group by ts having value > 10 order by value DESC",
		PanelType: v3.PanelTypeGraph,
	},
	{
		Name:  "Test count with having clause and filters",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
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
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toFloat64(count()) as value" +
			" from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND stringTagMap['method'] = 'GET' AND has(stringTagMap, 'name') group by ts having value > 10",
		PanelType: v3.PanelTypeValue,
	},
	{
		Name:  "Test aggregate PXX with groupby",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "durationNano", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorP05,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT now() as ts, stringTagMap['method'] as `method`, " +
			"quantile(0.05)(durationNano) as value " +
			"from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"AND has(stringTagMap, 'method') group by `method` " +
			"order by `method` ASC",
		PanelType: v3.PanelTypeTable,
	},
	{
		Name:  "Test aggregate PXX",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "durationNano", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorP05,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{},
			OrderBy:            []v3.OrderBy{},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT now() as ts, quantile(0.05)(durationNano) as value " +
			"from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')",
		PanelType: v3.PanelTypeTable,
	},
	{
		Name:  "Test aggregate rate table panel",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			StepInterval:       60,
			AggregateAttribute: v3.AttributeKey{Key: "durationNano", IsColumn: true, DataType: v3.AttributeKeyDataTypeFloat64, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorRate,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{},
			OrderBy:            []v3.OrderBy{},
		},
		TableName: "signoz_traces.distributed_signoz_index_v2",
		ExpectedQuery: "SELECT now() as ts, count(durationNano)/97.000000 as value " +
			"from signoz_traces.distributed_signoz_index_v2 " +
			"where (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')",
		PanelType: v3.PanelTypeTable,
	},
	{
		Name:  "Test Noop list view",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			SelectColumns: []v3.AttributeKey{
				{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			},
			QueryName:         "A",
			AggregateOperator: v3.AggregateOperatorNoOp,
			Expression:        "A",
			Filters:           &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
		},
		ExpectedQuery: "SELECT timestamp as timestamp_datetime, spanID, traceID," +
			" name as `name`  from signoz_traces.distributed_signoz_index_v2 where " +
			"(timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')  order by timestamp DESC",
		PanelType: v3.PanelTypeList,
	},
	{
		Name:  "Test Noop list view with order by",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			SelectColumns: []v3.AttributeKey{
				{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			},
			QueryName:         "A",
			AggregateOperator: v3.AggregateOperatorNoOp,
			Expression:        "A",
			Filters:           &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			OrderBy:           []v3.OrderBy{{ColumnName: "name", Order: "ASC"}},
		},
		ExpectedQuery: "SELECT timestamp as timestamp_datetime, spanID, traceID," +
			" name as `name`  from signoz_traces.distributed_signoz_index_v2 where " +
			"(timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')  order by `name` ASC",
		PanelType: v3.PanelTypeList,
	},
	{
		Name:  "Test Noop list view with order by and filter",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			SelectColumns: []v3.AttributeKey{
				{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			},
			QueryName:         "A",
			AggregateOperator: v3.AggregateOperatorNoOp,
			Expression:        "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			}},
			OrderBy: []v3.OrderBy{{ColumnName: "name", Order: "ASC"}},
		},
		ExpectedQuery: "SELECT timestamp as timestamp_datetime, spanID, traceID," +
			" name as `name`  from signoz_traces.distributed_signoz_index_v2 where " +
			"(timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000')" +
			"  AND stringTagMap['method'] = 'GET' order by `name` ASC",
		PanelType: v3.PanelTypeList,
	},
	{
		Name:  "Test Noop trace view",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:         "A",
			AggregateOperator: v3.AggregateOperatorNoOp,
			Expression:        "A",
			Filters: &v3.FilterSet{
				Operator: "AND", Items: []v3.FilterItem{
					{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
				},
			},
		},
		ExpectedQuery: "SELECT subQuery.serviceName, subQuery.name, count() AS span_count, subQuery.durationNano, subQuery.traceID" +
			" AS traceID FROM signoz_traces.distributed_signoz_index_v2 INNER JOIN" +
			" ( SELECT * FROM (SELECT traceID, durationNano, serviceName, name " +
			"FROM signoz_traces.signoz_index_v2 WHERE parentSpanID = '' AND (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			"ORDER BY durationNano DESC LIMIT 1 BY traceID LIMIT 100)" +
			" AS inner_subquery ) AS subQuery " +
			"ON signoz_traces.distributed_signoz_index_v2.traceID = subQuery.traceID WHERE (timestamp >= '1680066360726210000' AND timestamp <= '1680066458000000000') " +
			" AND stringTagMap['method'] = 'GET' GROUP BY subQuery.traceID, subQuery.durationNano, subQuery.name, subQuery.serviceName ORDER BY subQuery.durationNano desc LIMIT 1 BY subQuery.traceID ",
		PanelType: v3.PanelTypeTrace,
	},
}

func TestBuildTracesQuery(t *testing.T) {
	keys := map[string]v3.AttributeKey{
		"name": {Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
	}

	for _, tt := range testBuildTracesQueryData {
		tt.BuilderQuery.DataSource = v3.DataSourceTraces
		params := &v3.QueryRangeParamsV3{
			Version: "v4",
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": tt.BuilderQuery,
				},
			},
		}
		Enrich(params, keys)
		Convey("TestBuildTracesQuery", t, func() {
			query, err := buildTracesQuery(tt.Start, tt.End, tt.BuilderQuery.StepInterval, tt.BuilderQuery, tt.TableName, tt.PanelType, tt.Options)
			So(err, ShouldBeNil)
			So(query, ShouldEqual, tt.ExpectedQuery)
		})
	}
}

var testPrepTracesQueryData = []struct {
	Name          string
	PanelType     v3.PanelType
	Start         int64
	End           int64
	BuilderQuery  *v3.BuilderQuery
	ExpectedQuery string
	Keys          map[string]v3.AttributeKey
	Options       v3.QBOptions
}{
	{
		Name:      "Test TS with limit- first",
		PanelType: v3.PanelTypeGraph,
		Start:     1680066360726,
		End:       1680066458000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			Limit:        10,
			StepInterval: 60,
			GroupBy:      []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		},
		ExpectedQuery: "SELECT `method` from (SELECT stringTagMap['method'] as `method`," +
			" toFloat64(count(distinct(stringTagMap['name']))) as value from signoz_traces.distributed_signoz_index_v2" +
			" where (timestamp >= '1680066360000000000' AND timestamp <= '1680066420000000000') AND" +
			" stringTagMap['method'] = 'GET' AND has(stringTagMap, 'method') group by `method` order by value DESC) LIMIT 10",
		Keys: map[string]v3.AttributeKey{"name": {Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}},
		Options: v3.QBOptions{
			GraphLimitQtype: constants.FirstQueryGraphLimit,
		},
	},
	{
		Name:      "Test TS with limit- first - with order by value",
		PanelType: v3.PanelTypeGraph,
		Start:     1680066360726,
		End:       1680066458000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			Limit:        10,
			StepInterval: 60,
			GroupBy:      []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:      []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "ASC"}},
		},
		ExpectedQuery: "SELECT `method` from (SELECT stringTagMap['method'] as `method`," +
			" toFloat64(count(distinct(stringTagMap['name']))) as value from " +
			"signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360000000000'" +
			" AND timestamp <= '1680066420000000000') AND stringTagMap['method'] = 'GET' AND" +
			" has(stringTagMap, 'method') group by `method` order by value ASC) LIMIT 10",
		Keys: map[string]v3.AttributeKey{},
		Options: v3.QBOptions{
			GraphLimitQtype: constants.FirstQueryGraphLimit,
		},
	},
	{
		Name:      "Test TS with limit- first - with order by attribute",
		PanelType: v3.PanelTypeGraph,
		Start:     1680066360726,
		End:       1680066458000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "serviceName", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters:            &v3.FilterSet{},
			Limit:              10,
			StepInterval:       60,
			GroupBy:            []v3.AttributeKey{{Key: "serviceName", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}},
			OrderBy:            []v3.OrderBy{{ColumnName: "serviceName", Order: "ASC"}},
		},
		ExpectedQuery: "SELECT `serviceName` from (SELECT serviceName as `serviceName`," +
			" toFloat64(count(distinct(serviceName))) as value from " +
			"signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360000000000'" +
			" AND timestamp <= '1680066420000000000') " +
			"group by `serviceName` order by `serviceName` ASC) LIMIT 10",
		Keys: map[string]v3.AttributeKey{},
		Options: v3.QBOptions{
			GraphLimitQtype: constants.FirstQueryGraphLimit,
		},
	},
	{
		Name:      "Test TS with limit- first - with 2 group by and 2 order by",
		PanelType: v3.PanelTypeGraph,
		Start:     1680066360726,
		End:       1680066458000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "serviceName", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters:            &v3.FilterSet{},
			Limit:              10,
			StepInterval:       60,
			GroupBy: []v3.AttributeKey{
				{Key: "serviceName", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
				{Key: "http.method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			},
			OrderBy: []v3.OrderBy{{ColumnName: "serviceName", Order: "ASC"}, {ColumnName: constants.SigNozOrderByValue, Order: "ASC"}},
		},
		ExpectedQuery: "SELECT `serviceName`,`http.method` from (SELECT serviceName as `serviceName`," +
			" stringTagMap['http.method'] as `http.method`," +
			" toFloat64(count(distinct(serviceName))) as value from " +
			"signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360000000000'" +
			" AND timestamp <= '1680066420000000000') AND has(stringTagMap, 'http.method') " +
			"group by `serviceName`,`http.method` order by `serviceName` ASC,value ASC) LIMIT 10",
		Keys: map[string]v3.AttributeKey{},
		Options: v3.QBOptions{
			GraphLimitQtype: constants.FirstQueryGraphLimit,
		},
	},
	{
		Name:      "Test TS with limit- second",
		PanelType: v3.PanelTypeGraph,
		Start:     1680066360726,
		End:       1680066458000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			GroupBy:      []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			Limit:        2,
			StepInterval: 60,
		},
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, " +
			"stringTagMap['method'] as `method`, toFloat64(count(distinct(stringTagMap['name'])))" +
			" as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360000000000'" +
			" AND timestamp <= '1680066420000000000') AND stringTagMap['method'] = 'GET' AND" +
			" has(stringTagMap, 'method') AND (`method`) GLOBAL IN (%s) group by `method`,ts order by value DESC",
		Keys: map[string]v3.AttributeKey{},
		Options: v3.QBOptions{
			GraphLimitQtype: constants.SecondQueryGraphLimit,
		},
	},
	{
		Name:      "Test TS with limit- second - with order by",
		PanelType: v3.PanelTypeGraph,
		Start:     1680066360726,
		End:       1680066458000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			GroupBy:      []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:      []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
			Limit:        2,
			StepInterval: 60,
		},
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, " +
			"stringTagMap['method'] as `method`, toFloat64(count(distinct(stringTagMap['name'])))" +
			" as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360000000000'" +
			" AND timestamp <= '1680066420000000000') AND stringTagMap['method'] = 'GET' AND" +
			" has(stringTagMap, 'method') AND (`method`) GLOBAL IN (%s) group by `method`,ts order by `method` ASC", Keys: map[string]v3.AttributeKey{},
		Options: v3.QBOptions{
			GraphLimitQtype: constants.SecondQueryGraphLimit,
		},
	},
	{
		Name:      "Test TS with limit - second - with two group by and two order by",
		PanelType: v3.PanelTypeGraph,
		Start:     1680066360726,
		End:       1680066458000,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "="},
			},
			},
			GroupBy: []v3.AttributeKey{
				{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
				{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			},
			OrderBy:      []v3.OrderBy{{ColumnName: "method", Order: "ASC"}, {ColumnName: "name", Order: "ASC"}},
			Limit:        2,
			StepInterval: 60,
		},
		ExpectedQuery: "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, " +
			"stringTagMap['method'] as `method`, stringTagMap['name'] as `name`," +
			" toFloat64(count(distinct(stringTagMap['name'])))" +
			" as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1680066360000000000'" +
			" AND timestamp <= '1680066420000000000') AND stringTagMap['method'] = 'GET' AND" +
			" has(stringTagMap, 'method') AND has(stringTagMap, 'name') " +
			"AND (`method`,`name`) GLOBAL IN (%s) group by `method`,`name`,ts " +
			"order by `method` ASC,`name` ASC",
		Keys: map[string]v3.AttributeKey{},
		Options: v3.QBOptions{
			GraphLimitQtype: constants.SecondQueryGraphLimit,
		},
	},
}

func TestPrepareTracesQuery(t *testing.T) {
	for _, tt := range testPrepTracesQueryData {
		Convey("TestPrepareTracesQuery", t, func() {
			query, err := PrepareTracesQuery(tt.Start, tt.End, tt.PanelType, tt.BuilderQuery, tt.Options)
			So(err, ShouldBeNil)
			So(query, ShouldEqual, tt.ExpectedQuery)
		})
	}
}
