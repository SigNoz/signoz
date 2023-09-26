package v3

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var testEnrichmentRequiredData = []struct {
	Name               string
	Params             v3.QueryRangeParamsV3
	EnrichmentRequired bool
}{
	{
		Name: "attribute enrichment not required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{
							Key:      "test",
							Type:     v3.AttributeKeyTypeTag,
							DataType: v3.AttributeKeyDataTypeInt64,
						},
					},
				},
			},
		},
		EnrichmentRequired: false,
	},
	{
		Name: "attribute enrichment required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{
							Key: "test",
						},
					},
				},
			},
		},
		EnrichmentRequired: true,
	},
	{
		Name: "filter enrichment not required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "user_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "john", Operator: "="},
						}},
					},
				},
			},
		},
		EnrichmentRequired: false,
	},
	{
		Name: "filter enrichment required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "user_name"}, Value: "john", Operator: "="},
						}},
					},
				},
			},
		},
		EnrichmentRequired: true,
	},
	{
		Name: "filter enrichment not required required json",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "body.xyz", IsJSON: true, DataType: v3.AttributeKeyDataTypeString}, Value: "john", Operator: "="},
						}},
					},
				},
			},
		},
		EnrichmentRequired: true,
	},
	{
		Name: "groupBy enrichment not required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						GroupBy:    []v3.AttributeKey{{Key: "userid", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
					},
				},
			},
		},
		EnrichmentRequired: false,
	},
	{
		Name: "groupBy enrichment required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						GroupBy:    []v3.AttributeKey{{Key: "userid"}},
					},
				},
			},
		},
		EnrichmentRequired: true,
	},
	{
		Name: "orderBy enrichment not required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						GroupBy:    []v3.AttributeKey{{Key: "userid", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
						OrderBy:    []v3.OrderBy{{ColumnName: "userid"}},
					},
				},
			},
		},
		EnrichmentRequired: false,
	},
	{
		Name: "orderBy enrichment required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						OrderBy:    []v3.OrderBy{{ColumnName: "userid"}},
					},
				},
			},
		},
		EnrichmentRequired: true,
	},
	{
		Name: "top level key",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						GroupBy:    []v3.AttributeKey{{Key: "trace_id", Type: v3.AttributeKeyTypeUnspecified, DataType: v3.AttributeKeyDataTypeString, IsColumn: true}},
					},
				},
			},
		},
		EnrichmentRequired: false,
	},
	{
		Name: "orderBy enrichment required",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						GroupBy:    []v3.AttributeKey{{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
						OrderBy:    []v3.OrderBy{{ColumnName: "#SIGNOZ_VALUE", Order: "ASC"}},
					},
				},
			},
		},
		EnrichmentRequired: false,
	},
}

func TestEnrichmentRquired(t *testing.T) {
	for _, tt := range testEnrichmentRequiredData {
		Convey("testEnrichmentRequiredData", t, func() {
			res := EnrichmentRequired(&tt.Params)
			So(res, ShouldEqual, tt.EnrichmentRequired)
		})
	}
}

var testEnrichParamsData = []struct {
	Name   string
	Params v3.QueryRangeParamsV3
	Fields map[string]v3.AttributeKey
	Result v3.QueryRangeParamsV3
}{
	{
		Name: "Enriching query range v3 params",
		Params: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{
							Key: "test",
						},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "user_name"}, Value: "john", Operator: "="},
						}},
						GroupBy: []v3.AttributeKey{{Key: "trace_id"}},
						OrderBy: []v3.OrderBy{{ColumnName: "response_time"}},
					},
				},
			},
		},
		Fields: map[string]v3.AttributeKey{
			"test": {
				Key:      "test",
				Type:     v3.AttributeKeyTypeTag,
				DataType: v3.AttributeKeyDataTypeInt64,
			},
			"user_name": {
				Key:      "user_name",
				Type:     v3.AttributeKeyTypeTag,
				DataType: v3.AttributeKeyDataTypeString,
			},
			"response_time": {
				Key:      "response_time",
				Type:     v3.AttributeKeyTypeTag,
				DataType: v3.AttributeKeyDataTypeInt64,
			},
		},
		Result: v3.QueryRangeParamsV3{
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"test": {
						QueryName:  "test",
						Expression: "test",
						DataSource: v3.DataSourceLogs,
						AggregateAttribute: v3.AttributeKey{
							Key:      "test",
							Type:     v3.AttributeKeyTypeTag,
							DataType: v3.AttributeKeyDataTypeInt64,
						},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "user_name", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeString}, Value: "john", Operator: "="},
						}},
						GroupBy: []v3.AttributeKey{{Key: "trace_id", Type: v3.AttributeKeyTypeUnspecified, DataType: v3.AttributeKeyDataTypeString, IsColumn: true}},
						OrderBy: []v3.OrderBy{{ColumnName: "response_time", Key: "response_time", Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeInt64}},
					},
				},
			},
		},
	},
}

func TestEnrichParams(t *testing.T) {
	for _, tt := range testEnrichParamsData {
		Convey("testEnrichmentRequiredData", t, func() {
			Enrich(&tt.Params, tt.Fields)
			So(tt.Params, ShouldResemble, tt.Result)
		})
	}
}

var testJSONFilterEnrichData = []struct {
	Name   string
	Filter v3.FilterItem
	Result v3.FilterItem
}{
	{
		Name: "array string",
		Filter: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.requestor_list[*]",
				DataType: v3.AttributeKeyDataTypeUnspecified,
				Type:     v3.AttributeKeyTypeUnspecified,
			},
			Operator: "has",
			Value:    "index_service",
		},
		Result: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.requestor_list[*]",
				DataType: v3.AttributeKeyDataTypeArrayString,
				Type:     v3.AttributeKeyTypeUnspecified,
				IsJSON:   true,
			},
			Operator: "has",
			Value:    "index_service",
		},
	},
	{
		Name: "int64",
		Filter: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.intx",
				DataType: v3.AttributeKeyDataTypeUnspecified,
				Type:     v3.AttributeKeyTypeUnspecified,
			},
			Operator: "=",
			Value:    10,
		},
		Result: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.intx",
				DataType: v3.AttributeKeyDataTypeInt64,
				Type:     v3.AttributeKeyTypeUnspecified,
				IsJSON:   true,
			},
			Operator: "=",
			Value:    10,
		},
	},
	{
		Name: "float64",
		Filter: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.float64[*]",
				DataType: v3.AttributeKeyDataTypeArrayFloat64,
				Type:     v3.AttributeKeyTypeUnspecified,
			},
			Operator: "!=",
			Value:    10.0,
		},
		Result: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.float64[*]",
				DataType: v3.AttributeKeyDataTypeArrayFloat64,
				Type:     v3.AttributeKeyTypeUnspecified,
				IsJSON:   true,
			},
			Operator: "!=",
			Value:    10.0,
		},
	},
	{
		Name: "float64x",
		Filter: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.float64x",
				DataType: v3.AttributeKeyDataTypeUnspecified,
				Type:     v3.AttributeKeyTypeUnspecified,
			},
			Operator: "!=",
			Value:    "10.0",
		},
		Result: v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body.float64x",
				DataType: v3.AttributeKeyDataTypeFloat64,
				Type:     v3.AttributeKeyTypeUnspecified,
				IsJSON:   true,
			},
			Operator: "!=",
			Value:    10.0,
		},
	},
}

func TestJsonEnrich(t *testing.T) {
	for _, tt := range testJSONFilterEnrichData {
		Convey(tt.Name, t, func() {
			res := jsonFilterEnrich(tt.Filter)
			So(res, ShouldResemble, tt.Result)
		})
	}
}

var testParseStrValueData = []struct {
	Name       string
	Operator   v3.FilterOperator
	Value      interface{}
	ResultType string
	Result     interface{}
}{
	{
		Name:       "bool",
		Value:      "true",
		Operator:   v3.FilterOperatorEqual,
		ResultType: "bool",
		Result:     true,
	},
	{
		Name:       "int",
		Value:      "10",
		Operator:   v3.FilterOperatorNotEqual,
		ResultType: "int64",
		Result:     10,
	},
	{
		Name:       "float",
		Value:      "10.0",
		Operator:   v3.FilterOperatorGreaterThan,
		ResultType: "float64",
		Result:     10.0,
	},
	{
		Name:       "string",
		Value:      "hello",
		Operator:   v3.FilterOperatorLessThan,
		ResultType: "string",
		Result:     "hello",
	},
}

func TestParseStrValue(t *testing.T) {
	for _, tt := range testParseStrValueData {
		Convey(tt.Name, t, func() {
			vtype, value := parseStrValue(tt.Value.(string), tt.Operator)
			So(vtype, ShouldEqual, tt.ResultType)
			So(value, ShouldEqual, tt.Result)
		})
	}
}
