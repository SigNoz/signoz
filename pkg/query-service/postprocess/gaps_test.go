package postprocess

import (
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
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
		{
			name: "Single series with gaps and time shift",
			results: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1747597560000, Value: 2.0}, // 19 May 2025 1:16:00 AM
					}),
				}),
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1747595100000, // 19 May 2025 12:35:00 AM
				End:   1747599000000, // 19 May 2025 1:40:00 AM
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"query1": {
							StepInterval: 840, // 14 minutes
							QueryName:    "query1",
							Expression:   "query1",
							ShiftBy:      3600, // 1 hour
						},
					},
				},
			},
			expected: []*v3.Result{
				createResult("query1", []*v3.Series{
					createSeries([]v3.Point{
						{Timestamp: 1747595040000, Value: 0.0}, // 19 May 2025 12:34:00 AM
						{Timestamp: 1747595880000, Value: 0.0}, // 19 May 2025 12:48:00 AM
						{Timestamp: 1747596720000, Value: 0.0}, // 19 May 2025 1:02:00 AM
						{Timestamp: 1747597560000, Value: 2.0}, // 19 May 2025 1:16:00 AM
						{Timestamp: 1747598400000, Value: 0.0}, // 19 May 2025 1:30:00 AM
					}),
				}),
			},
		},
	}

	// Execute test cases
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			FillGaps(tt.results, tt.params)
			if len(tt.results) != len(tt.expected) {
				t.Errorf("Test %s failed: expected %d results, got %d", tt.name, len(tt.expected), len(tt.results))
			}
			for i, result := range tt.results {
				if len(result.Series) != len(tt.expected[i].Series) {
					t.Errorf("Test %s failed: expected %d series, got %d", tt.name, len(tt.expected[i].Series), len(result.Series))
				}
				for j, series := range result.Series {
					if len(series.Points) != len(tt.expected[i].Series[j].Points) {
						t.Errorf("Test %s failed: expected %d points, got %d", tt.name, len(tt.expected[i].Series[j].Points), len(series.Points))
					}
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
