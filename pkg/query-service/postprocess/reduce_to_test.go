package postprocess

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestApplyReduceTo(t *testing.T) {
	type testCase struct {
		name    string
		results []*v3.Result
		params  *v3.QueryRangeParamsV3
		want    []*v3.Result
	}

	testCases := []testCase{
		{
			name: "test reduce to",
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
					PanelType: v3.PanelTypeValue,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							DataSource: v3.DataSourceMetrics,
							ReduceTo:   v3.ReduceToOperatorSum,
						},
					},
				},
			},
			want: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Points: []v3.Point{
								{
									Value: 1.5,
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

			applyReduceTo(tc.results, tc.params)
			got := tc.results

			for _, gotResult := range got {
				for _, wantResult := range tc.want {
					if gotResult.QueryName == wantResult.QueryName {
						if len(gotResult.Series) != len(wantResult.Series) {
							t.Errorf("got %v, want %v", gotResult.Series, wantResult.Series)
						} else {
							for i, gotSeries := range gotResult.Series {
								for j, gotPoint := range gotSeries.Points {
									if gotPoint.Value != wantResult.Series[i].Points[j].Value {
										t.Errorf("got %v, want %v", gotPoint.Value, wantResult.Series[i].Points[j].Value)
									}
								}
							}
						}
					}
				}
			}
		})
	}
}
