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
	{
		Name:               "top level column",
		AttributeKey:       v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
		ExpectedColumnName: "trace_id",
	},
	{
		Name:               "top level column with isColumn ignored",
		AttributeKey:       v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag, IsColumn: false},
		ExpectedColumnName: "trace_id",
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
		Name:  "Test aggregate count on select field",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:         "A",
			AggregateOperator: v3.AggregateOpeatorCount,
			Expression:        "A",
		},
		TableName:     "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, toFloat64(count(*)) as value from signoz_logs.distributed_logs where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) group by ts order by ts",
	},
	{
		Name:  "Test aggregate count distinct on select field",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
		},
		TableName:     "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, toFloat64(count(distinct(name))) as value from signoz_logs.distributed_logs where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) group by ts order by ts",
	},
	{
		Name:  "Test aggregate count distinct on non selected field",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
		},
		TableName:     "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, toFloat64(count(distinct(attributes_string_value[indexOf(attributes_string_key, 'name')]))) as value from signoz_logs.distributed_logs where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) group by ts order by ts",
	},
	{
		Name:  "Test aggregate count distinct with filter and groupBy",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "eq"},
				{Key: v3.AttributeKey{Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "abc", Operator: "neq"},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}, {ColumnName: "ts", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"toFloat64(count(distinct(name))) as value from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"AND attributes_string_value[indexOf(attributes_string_key, 'method')] = 'GET' AND resources_string_value[indexOf(resources_string_key, 'x')] != 'abc' " +
			"group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate count with multiple filter,groupBy and orderBy",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "name", IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorCountDistinct,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "eq"},
				{Key: v3.AttributeKey{Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "abc", Operator: "neq"},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, {Key: "x", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}, {ColumnName: "x", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"resources_string_value[indexOf(resources_string_key, 'x')] as x, " +
			"toFloat64(count(distinct(name))) as value from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"AND attributes_string_value[indexOf(attributes_string_key, 'method')] = 'GET' AND resources_string_value[indexOf(resources_string_key, 'x')] != 'abc' " +
			"group by method,x,ts " +
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
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "eq"},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}, {ColumnName: "x", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"avg(attributes_float64_value[indexOf(attributes_float64_key, 'bytes')]) as value " +
			"from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"AND attributes_string_value[indexOf(attributes_string_key, 'method')] = 'GET' " +
			"group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate sum",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorSum,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "eq"},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"sum(bytes) as value " +
			"from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"AND attributes_string_value[indexOf(attributes_string_key, 'method')] = 'GET' " +
			"group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate min",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorMin,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "eq"},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"min(bytes) as value " +
			"from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"AND attributes_string_value[indexOf(attributes_string_key, 'method')] = 'GET' " +
			"group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate max",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorMax,
			Expression:         "A",
			Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "GET", Operator: "eq"},
			},
			},
			GroupBy: []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy: []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"max(bytes) as value " +
			"from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"AND attributes_string_value[indexOf(attributes_string_key, 'method')] = 'GET' " +
			"group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate PXX",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorP05,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts," +
			" attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"quantile(0.5)(bytes) as value " +
			"from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate RateSum",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			QueryName:          "A",
			AggregateAttribute: v3.AttributeKey{Key: "bytes", IsColumn: true},
			AggregateOperator:  v3.AggregateOperatorRateSum,
			Expression:         "A",
			Filters:            &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			GroupBy:            []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			OrderBy:            []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, attributes_string_value[indexOf(attributes_string_key, 'method')] as method" +
			", sum(bytes)/60 as value from signoz_logs.distributed_logs " +
			"where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000)" +
			" group by method,ts order by method ASC,ts",
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
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, " +
			"count(attributes_float64_value[indexOf(attributes_float64_key, 'bytes')])/60 as value " +
			"from signoz_logs.distributed_logs where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test aggregate RateSum without materialized column",
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
		TableName: "logs",
		ExpectedQuery: "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, " +
			"attributes_string_value[indexOf(attributes_string_key, 'method')] as method, " +
			"sum(attributes_float64_value[indexOf(attributes_float64_key, 'bytes')])/60 as value " +
			"from signoz_logs.distributed_logs where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) " +
			"group by method,ts " +
			"order by method ASC,ts",
	},
	{
		Name:  "Test Noop",
		Start: 1680066360726210000,
		End:   1680066458000000000,
		Step:  60,
		BuilderQuery: &v3.BuilderQuery{
			SelectColumns:     []v3.AttributeKey{},
			QueryName:         "A",
			AggregateOperator: v3.AggregateOperatorNoOp,
			Expression:        "A",
			Filters:           &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
			// GroupBy:           []v3.AttributeKey{{Key: "method", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
			// OrderBy:           []v3.OrderBy{{ColumnName: "method", Order: "ASC"}},
		},
		TableName: "logs",
		ExpectedQuery: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body,CAST((attributes_string_key, attributes_string_value), 'Map(String, String)') as  attributes_string," +
			"CAST((attributes_int64_key, attributes_int64_value), 'Map(String, Int64)') as  attributes_int64,CAST((attributes_float64_key, attributes_float64_value), 'Map(String, Float64)') as  attributes_float64," +
			"CAST((resources_string_key, resources_string_value), 'Map(String, String)') as resources_string " +
			"from signoz_logs.distributed_logs where (timestamp >= 1680066360726210000 AND timestamp <= 1680066458000000000) ",
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
