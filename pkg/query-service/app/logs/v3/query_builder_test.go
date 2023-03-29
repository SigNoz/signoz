package v3

import (
	"fmt"
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var testGetClickhouseColumnNameData = []struct {
	Name               string
	AttributeKey       v3.AttributeKey
	ExpectedColumnName string
}{
	{
		Name:               "attribute",
		AttributeKey:       v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
		ExpectedColumnName: "attributes_string_value[indexOf(attributes_string_key, 'user_name')]",
	},
	{
		Name:               "resource",
		AttributeKey:       v3.AttributeKey{Key: "servicename", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
		ExpectedColumnName: "resources_string_value[indexOf(resources_string_key, 'servicename')]",
	},
	{
		Name:               "selected field",
		AttributeKey:       v3.AttributeKey{Key: "servicename", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true},
		ExpectedColumnName: "servicename",
	},
}

func TestGetClickhouseColumnName(t *testing.T) {
	for _, tt := range testGetClickhouseColumnNameData {
		Convey("testGetClickhouseColumnNameData", t, func() {
			columnName := getClickhouseColumnName(tt.AttributeKey)
			So(columnName, ShouldEqual, tt.ExpectedColumnName)
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
		AggregateOperator: v3.AggregateOpeatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
		SelectLabels:      ", attributes_string_value[indexOf(attributes_string_key, 'user_name')] as user_name",
	},
	{
		Name:              "select fields for groupBy resource",
		AggregateOperator: v3.AggregateOpeatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}},
		SelectLabels:      ", resources_string_value[indexOf(resources_string_key, 'user_name')] as user_name",
	},
	{
		Name:              "select fields for groupBy attribute and resource",
		AggregateOperator: v3.AggregateOpeatorCount,
		GroupByTags: []v3.AttributeKey{
			{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource},
			{Key: "host", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
		},
		SelectLabels: ", resources_string_value[indexOf(resources_string_key, 'user_name')] as user_name, attributes_string_value[indexOf(attributes_string_key, 'host')] as host",
	},
	{
		Name:              "select fields for groupBy materialized columns",
		AggregateOperator: v3.AggregateOpeatorCount,
		GroupByTags:       []v3.AttributeKey{{Key: "host", IsColumn: true}},
		SelectLabels:      ", host as host",
	},
}

func TestGetSelectLabels(t *testing.T) {
	for _, tt := range testGetSelectLabelsData {
		Convey("testGetSelectLabelsData", t, func() {
			selectLabels := getSelectLabels(tt.AggregateOperator, tt.GroupByTags)
			fmt.Println(selectLabels)
			So(selectLabels, ShouldEqual, tt.SelectLabels)
		})
	}
}

var timeSeriesFilterQueryData = []struct {
	Name           string
	FilterSet      *v3.FilterSet
	TableName      string
	ExpectedFilter string
}{
	{
		Name: "Test attribute and resource attribute",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "john", Operator: "eq"},
			{Key: v3.AttributeKey{Key: "k8s_namespace", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "my_service", Operator: "neq"},
		}},
		TableName:      "logs",
		ExpectedFilter: " AND attributes_string_value[indexOf(attributes_string_key, 'user_name')] = 'john' AND resources_string_value[indexOf(resources_string_key, 'k8s_namespace')] != 'my_service'",
	},
	{
		Name: "Test materialized column",
		FilterSet: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
			{Key: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: "john", Operator: "eq"},
			{Key: v3.AttributeKey{Key: "k8s_namespace", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "my_service", Operator: "neq"},
		}},
		TableName:      "logs",
		ExpectedFilter: " AND user_name = 'john' AND resources_string_value[indexOf(resources_string_key, 'k8s_namespace')] != 'my_service'",
	},
}

func TestBuildLogsTimeSeriesFilterQuery(t *testing.T) {
	for _, tt := range timeSeriesFilterQueryData {
		Convey("TestBuildLogsTimeSeriesFilterQuery", t, func() {
			query, err := buildLogsTimeSeriesFilterQuery(tt.FilterSet)
			So(err, ShouldBeNil)
			So(query, ShouldEqual, tt.ExpectedFilter)
			fmt.Println(query)
		})
	}
}

var testBuildLogsQueryData = []struct {
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
		Name:  "Test aggregate count",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName: "A",
			// AggregateAttribute: v3.AttributeKey{Key: "name"},
			AggregateOperator: v3.AggregateOpeatorCount,
			Expression:        "A",
		},
		TableName:     "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, toFloat64(count(*)) as value from signoz_logs.distributed_logs where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) group by ts order by ts",
	},
	{
		Name:  "Test aggregate count with filter and groupBy",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName: "A",
			// AggregateAttribute: v3.AttributeKey{Key: "name"},
			AggregateOperator: v3.AggregateOpeatorCount,
			Expression:        "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "eq"},
				{Key: v3.AttributeKey{Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "abc", Operator: "neq"},
			},
			},
			SelectColumns: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			GroupBy:       []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:       []v3.OrderBy{{ColumnName: "method", Order: "ASC"}, {ColumnName: "ts", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"toFloat64(count(*)) as value from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"AND attributes_string_value[indexOf(attributes_string_key, 'method')] = 'GET' AND resources_string_value[indexOf(resources_string_key, 'x')] != 'abc' " +
			"group by ts,method " +
			"order by ts,method ASC",
	},
	{
		Name:  "Test aggregate count with multiple filter,groupBy and orderBy",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:         "A",
			AggregateOperator: v3.AggregateOpeatorCount,
			Expression:        "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "eq"},
				{Key: v3.AttributeKey{Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "abc", Operator: "neq"},
			},
			},
			SelectColumns: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			GroupBy:       []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, {Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}},
			OrderBy:       []v3.OrderBy{{ColumnName: "method", Order: "ASC"}, {ColumnName: "x", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"resources_string_value[indexOf(resources_string_key, 'x')] as x, " +
			"toFloat64(count(*)) as value from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"AND attributes_string_value[indexOf(attributes_string_key, 'method')] = 'GET' AND resources_string_value[indexOf(resources_string_key, 'x')] != 'abc' " +
			"group by ts,method,x " +
			"order by ts,method ASC,x ASC",
	},
}

func TestBuildLogsQuery(t *testing.T) {
	for _, tt := range testBuildLogsQueryData {
		Convey("TestBuildLogsQuery", t, func() {
			query, err := buildLogsQuery(tt.Start, tt.End, tt.Step, tt.BuilderQuery, tt.TableName)
			fmt.Println(query)
			So(err, ShouldBeNil)
			So(query, ShouldEqual, tt.ExpectedQuery)

		})
	}
}
