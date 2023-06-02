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
