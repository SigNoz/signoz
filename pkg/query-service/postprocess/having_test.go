package postprocess

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestApplyHavingCaluse(t *testing.T) {
	type testCase struct {
		name    string
		results []*v3.Result
		params  *v3.QueryRangeParamsV3
		want    []*v3.Result
	}

	testCases := []testCase{
		{
			name: "test having equal to",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							DataSource: v3.DataSourceMetrics,
							Having: []v3.Having{
								{
									Operator: v3.HavingOperatorEqual,
									Value:    0.3,
								},
							},
						},
					},
				},
			},
			want: []*v3.Result{
				{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.3,
								},
							},
						},
					},
				},
			},
		},
		{
			name: "test having `in`",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							DataSource: v3.DataSourceMetrics,
							Having: []v3.Having{
								{
									Operator: v3.HavingOperatorIn,
									Value:    []interface{}{0.3, 0.4},
								},
							},
						},
					},
				},
			},
			want: []*v3.Result{
				{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
							},
						},
					},
				},
			},
		},
		{
			name: "test having `not in` and multiple results",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							DataSource: v3.DataSourceMetrics,
							Having: []v3.Having{
								{
									Operator: v3.HavingOperatorNotIn,
									Value:    []interface{}{0.3, 0.4},
								},
							},
						},
						"B": {
							DataSource: v3.DataSourceMetrics,
							Having: []v3.Having{
								{
									Operator: v3.HavingOperatorNotIn,
									Value:    []interface{}{0.1},
								},
							},
						},
					},
				},
			},
			want: []*v3.Result{
				{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
				{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
							},
						},
					},
				},
			},
		},
		{
			name: "test multiple having clause",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.5,
								},
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
								{
									Value: 0.2,
								},
								{
									Value: 0.1,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							DataSource: v3.DataSourceMetrics,
							Having: []v3.Having{
								{
									Operator: v3.HavingOperatorGreaterThanOrEq,
									Value:    0.3,
								},
								{
									Operator: v3.HavingOperatorLessThanOrEq,
									Value:    0.4,
								},
							},
						},
					},
				},
			},
			want: []*v3.Result{
				{
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 0.4,
								},
								{
									Value: 0.3,
								},
							},
						},
					},
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {

			ApplyHavingClause(tc.results, tc.params)

			got := tc.results

			if len(got) != len(tc.want) {
				t.Errorf("got %v, want %v", len(got), len(tc.want))
			}

			for i := range got {
				if len(got[i].Series) != len(tc.want[i].Series) {
					t.Errorf("got %v, want %v", len(got[i].Series), len(tc.want[i].Series))
				}

				for j := range got[i].Series {
					if len(got[i].Series[j].Points) != len(tc.want[i].Series[j].Points) {
						t.Errorf("got %v, want %v", len(got[i].Series[j].Points), len(tc.want[i].Series[j].Points))
					}

					for k := range got[i].Series[j].Points {
						if got[i].Series[j].Points[k].Value != tc.want[i].Series[j].Points[k].Value {
							t.Errorf("got %v, want %v", got[i].Series[j].Points[k].Value, tc.want[i].Series[j].Points[k].Value)
						}
					}
				}
			}
		})
	}
}
