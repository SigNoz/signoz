package app

import (
	"reflect"
	"testing"

	"github.com/SigNoz/govaluate"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestFindUniqueLabelSets(t *testing.T) {
	tests := []struct {
		name   string
		result []*v3.Result
		want   []map[string]string
	}{
		{
			name: "test1",
			result: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
								"operation":    "GET /api",
							},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "redis",
							},
						},
					},
				},
			},
			want: []map[string]string{
				{
					"service_name": "frontend",
					"operation":    "GET /api",
				},
				{
					"service_name": "redis",
				},
			},
		},
		{
			name: "test2",
			result: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
								"operation":    "GET /api",
							},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
							},
						},
					},
				},
				{
					QueryName: "C",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"operation": "PUT /api",
							},
						},
					},
				},
				{
					QueryName: "D",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
								"http_status":  "200",
							},
						},
					},
				},
			},
			want: []map[string]string{
				{
					"service_name": "frontend",
					"operation":    "GET /api",
				},
				{
					"operation": "PUT /api",
				},
				{
					"service_name": "frontend",
					"http_status":  "200",
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := findUniqueLabelSets(tt.result)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("findUniqueLabelSets() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestProcessResults(t *testing.T) {
	tests := []struct {
		name    string
		results []*v3.Result
		want    *v3.Result
	}{
		{
			name: "test1",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
								"operation":    "GET /api",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     10,
								},
								{
									Timestamp: 2,
									Value:     20,
								},
							},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "redis",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     30,
								},
								{
									Timestamp: 3,
									Value:     40,
								},
							},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expression, err := govaluate.NewEvaluableExpression("A + B")
			if err != nil {
				t.Errorf("Error parsing expression: %v", err)
			}
			got, err := processResults(tt.results, expression)
			if err != nil {
				t.Errorf("Error processing results: %v", err)
			}
			if len(got.Series) != len(tt.want.Series) {
				t.Errorf("processResults(): number of sereis - got = %v, want %v", len(got.Series), len(tt.want.Series))
			}

			for i := range got.Series {
				if len(got.Series[i].Points) != len(tt.want.Series[i].Points) {
					t.Errorf("processResults(): number of points - got = %v, want %v", got, tt.want)
				}
				for j := range got.Series[i].Points {
					if got.Series[i].Points[j].Value != tt.want.Series[i].Points[j].Value {
						t.Errorf("processResults(): got = %v, want %v", got.Series[i].Points[j].Value, tt.want.Series[i].Points[j].Value)
					}
				}
			}
		})
	}
}

func TestProcessResultsErrorRate(t *testing.T) {
	tests := []struct {
		name    string
		results []*v3.Result
		want    *v3.Result
	}{
		{
			name: "test1",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     10,
								},
								{
									Timestamp: 2,
									Value:     20,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "redis",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     12,
								},
								{
									Timestamp: 2,
									Value:     45,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "route",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     2,
								},
								{
									Timestamp: 2,
									Value:     45,
								},
							},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "redis",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     6,
								},
								{
									Timestamp: 2,
									Value:     9,
								},
							},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Labels: map[string]string{
							"service_name": "redis",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     0.5,
							},
							{
								Timestamp: 2,
								Value:     0.2,
							},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expression, err := govaluate.NewEvaluableExpression("B/A")
			if err != nil {
				t.Errorf("Error parsing expression: %v", err)
			}
			got, err := processResults(tt.results, expression)
			if err != nil {
				t.Errorf("Error processing results: %v", err)
			}
			if len(got.Series) != len(tt.want.Series) {
				t.Errorf("processResults(): number of sereis - got = %v, want %v", len(got.Series), len(tt.want.Series))
			}

			for i := range got.Series {
				if len(got.Series[i].Points) != len(tt.want.Series[i].Points) {
					t.Errorf("processResults(): number of points - got = %v, want %v", got, tt.want)
				}
				for j := range got.Series[i].Points {
					if got.Series[i].Points[j].Value != tt.want.Series[i].Points[j].Value {
						t.Errorf("processResults(): got = %v, want %v", got.Series[i].Points[j].Value, tt.want.Series[i].Points[j].Value)
					}
				}
			}
		})
	}
}
