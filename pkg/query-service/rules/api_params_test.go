package rules

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestIsAllQueriesDisabled(t *testing.T) {
	type testCase struct {
		compositeQuery *v3.CompositeQuery
		expectedErr    bool
	}

	testCases := []testCase{
		{
			compositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"query1": {
						Disabled: true,
					},
					"query2": {
						Disabled: true,
					},
				},
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
			},
			expectedErr: true,
		},
		{
			compositeQuery: &v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
			},
			expectedErr: true,
		},
		{
			compositeQuery: &v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"query1": {
						Disabled:     true,
						QueryName:    "query1",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "durationNano",
						},
						AggregateOperator: v3.AggregateOperatorP95,
						DataSource:        v3.DataSourceTraces,
						Expression:        "query1",
					},
					"query2": {
						Disabled:     false,
						QueryName:    "query2",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "durationNano",
						},
						AggregateOperator: v3.AggregateOperatorP95,
						DataSource:        v3.DataSourceTraces,
						Expression:        "query2",
					},
				},
			},
			expectedErr: false,
		},
		{
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PanelType: v3.PanelTypeGraph,
			},
			expectedErr: true,
		},
		{
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PanelType: v3.PanelTypeGraph,
				PromQueries: map[string]*v3.PromQuery{
					"query3": {
						Disabled: false,
						Query:    "query3",
					},
				},
			},
			expectedErr: true,
		},
		{
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PanelType: v3.PanelTypeGraph,
				PromQueries: map[string]*v3.PromQuery{
					"query3": {
						Disabled: true,
					},
				},
			},
			expectedErr: true,
		},
		{
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				PanelType: v3.PanelTypeGraph,
			},
			expectedErr: true,
		},
		{
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				PanelType: v3.PanelTypeGraph,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"query4": {
						Disabled: false,
						Query:    "query4",
					},
				},
			},
			expectedErr: false,
		},
		{
			compositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				PanelType: v3.PanelTypeGraph,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"query4": {
						Disabled: true,
					},
				},
			},
			expectedErr: true,
		},
	}

	for idx, testCase := range testCases {
		err := testCase.compositeQuery.Validate()
		if err != nil {
			if !testCase.expectedErr {
				t.Errorf("Expected nil for test case %d, but got %v", idx, err)
			}
		}
	}
}
