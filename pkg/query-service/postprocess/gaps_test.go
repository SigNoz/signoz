package postprocess

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestFillGaps(t *testing.T) {
	// Helper function to create a sample series
	createSeries := func(points []v3.Point) *v3.Series {
		return &v3.Series{
			Points: points,
		}
	}

	// Helper function to create a sample result
	createResult := func(queryName string, series []*v3.Series) *v3.Result {
		return &v3.Result{
			QueryName: queryName,
			Series:    series,
		}
	}

	// Define test cases
	tests := []struct {
		name     string
		results  []*v3.Result
		params   *v3.QueryRangeParamsV3
		expected []*v3.Result
	}{
		{
			name: "Single series with gaps",
			results: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1000, Value: 1.0},
						{Timestamp: 3000, Value: 3.0},
					}),
				}),
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1000,
				End:   5000,
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"query1": {
							QueryName:    "query1",
							Expression:   "query1",
							StepInterval: 1,
						},
					},
				},
			},
			expected: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1000, Value: 1.0},
						{Timestamp: 2000, Value: 0.0},
						{Timestamp: 3000, Value: 3.0},
						{Timestamp: 4000, Value: 0.0},
						{Timestamp: 5000, Value: 0.0},
					}),
				}),
			},
		},
		{
			name: "Multiple series with gaps",
			results: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1000, Value: 1.0},
						{Timestamp: 3000, Value: 3.0},
					}),
					createSeries([]v3.Point{
						{Timestamp: 2000, Value: 2.0},
						{Timestamp: 4000, Value: 4.0},
					}),
				}),
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1000,
				End:   5000,
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"query1": {
							QueryName:    "query1",
							Expression:   "query1",
							StepInterval: 1,
						},
					},
				},
			},
			expected: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1000, Value: 1.0},
						{Timestamp: 2000, Value: 0.0},
						{Timestamp: 3000, Value: 3.0},
						{Timestamp: 4000, Value: 0.0},
						{Timestamp: 5000, Value: 0.0},
					}),
					createSeries([]v3.Point{
						{Timestamp: 1000, Value: 0.0},
						{Timestamp: 2000, Value: 2.0},
						{Timestamp: 3000, Value: 0.0},
						{Timestamp: 4000, Value: 4.0},
						{Timestamp: 5000, Value: 0.0},
					}),
				}),
			},
		},
		{
			name: "Single series with no data",
			results: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{}),
				}),
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1000,
				End:   5000,
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"query1": {
							QueryName:    "query1",
							Expression:   "query1",
							StepInterval: 1,
						},
					},
				},
			},
			expected: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1000, Value: 0.0},
						{Timestamp: 2000, Value: 0.0},
						{Timestamp: 3000, Value: 0.0},
						{Timestamp: 4000, Value: 0.0},
						{Timestamp: 5000, Value: 0.0},
					}),
				}),
			},
		},
		{
			name: "Single series with gaps and panel type is not graph",
			results: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1000, Value: 1.0},
						{Timestamp: 3000, Value: 3.0},
					}),
				}),
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1000,
				End:   5000,
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeList,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"query1": {
							QueryName:    "query1",
							Expression:   "query1",
							StepInterval: 1,
						},
					},
				},
			},
			expected: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1000, Value: 1.0},
						{Timestamp: 3000, Value: 3.0},
					}),
				}),
			},
		},
	}

	// Execute test cases
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			FillGaps(tt.results, tt.params)
			for i, result := range tt.results {
				for j, series := range result.Series {
					for k, point := range series.Points {
						if point.Timestamp != tt.expected[i].Series[j].Points[k].Timestamp ||
							point.Value != tt.expected[i].Series[j].Points[k].Value {
							t.Errorf("Test %s failed: expected (%v, %v), got (%v, %v)", tt.name,
								tt.expected[i].Series[j].Points[k].Timestamp,
								tt.expected[i].Series[j].Points[k].Value,
								point.Timestamp, point.Value)
						}
					}
				}
			}
		})
	}
}
