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
						GroupBy:    []v3.AttributeKey{{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
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
						GroupBy:    []v3.AttributeKey{{Key: "trace_id"}},
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
						GroupBy:    []v3.AttributeKey{{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}},
						OrderBy:    []v3.OrderBy{{ColumnName: "trace_id"}},
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
						OrderBy:    []v3.OrderBy{{ColumnName: "trace_id"}},
					},
				},
			},
		},
		EnrichmentRequired: true,
	},
}

func TestEnrichMentRquired(t *testing.T) {
	for _, tt := range testEnrichmentRequiredData {
		Convey("testEnrichmentRequiredData", t, func() {
			res := EnrichmentRequired(&tt.Params)
			So(res, ShouldEqual, tt.EnrichmentRequired)
		})
	}
}
