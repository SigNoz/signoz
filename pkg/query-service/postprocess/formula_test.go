package postprocess

import (
	"reflect"
	"testing"

	"github.com/SigNoz/govaluate"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestFindUniqueLabelSets(t *testing.T) {
	tests := []struct {
		name                string
		result              []*v3.Result
		want                []map[string]string
		queriesInExpression map[string]struct{}
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
			queriesInExpression: map[string]struct{}{
				"A": {},
				"B": {},
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
			queriesInExpression: map[string]struct{}{
				"A": {},
				"B": {},
				"C": {},
				"D": {},
			},
			want: []map[string]string{
				{
					"service_name": "frontend",
					"operation":    "GET /api",
				},
				{
					"service_name": "frontend",
					"http_status":  "200",
				},
				{
					"operation": "PUT /api",
				},
			},
		},
		{
			name: "empty result",
			result: []*v3.Result{
				{
					QueryName: "A",
					Series:    []*v3.Series{},
				},
				{
					QueryName: "B",
					Series:    []*v3.Series{},
				},
			},
			queriesInExpression: map[string]struct{}{
				"A": {},
				"B": {},
			},
			want: []map[string]string{},
		},
		{
			name: "results with overlapping labels",
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
						{
							Labels: map[string]string{
								"service_name": "redis",
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
						{
							Labels: map[string]string{
								"service_name": "frontend",
							},
						},
					},
				},
			},
			queriesInExpression: map[string]struct{}{
				"A": {},
				"B": {},
			},
			want: []map[string]string{
				{
					"service_name": "frontend",
					"operation":    "GET /api",
				},
				{
					"service_name": "redis",
					"operation":    "GET /api",
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := findUniqueLabelSets(tt.result, tt.queriesInExpression)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("findUniqueLabelSets() = %v, want %v\n", got, tt.want)
			}
		})
	}
}

func TestProcessResults(t *testing.T) {
	tests := []struct {
		name       string
		results    []*v3.Result
		want       *v3.Result
		expression string
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
			expression: "A + B",
		},
		{
			name: "test2",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     10,
								},
								{
									Timestamp: 2,
									Value:     0,
								},
							},
						},
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							Labels: map[string]string{},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     0,
								},
								{
									Timestamp: 3,
									Value:     10,
								},
							},
						},
					},
				},
			},
			want: &v3.Result{
				Series: []*v3.Series{
					{
						Labels: map[string]string{},
						Points: []v3.Point{
							{
								Timestamp: 3,
								Value:     0,
							},
						},
					},
				},
			},
			expression: "A/B",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expression, err := govaluate.NewEvaluableExpression(tt.expression)
			if err != nil {
				t.Errorf("Error parsing expression: %v", err)
			}
			canDefaultZero := map[string]bool{
				"A": true,
				"B": true,
			}
			got, err := processResults(tt.results, expression, canDefaultZero)
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
							"service_name": "frontend",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     0,
							},
							{
								Timestamp: 2,
								Value:     0,
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
								Value:     0.5,
							},
							{
								Timestamp: 2,
								Value:     0.2,
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
								Value:     0,
							},
							{
								Timestamp: 2,
								Value:     0,
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
			canDefaultZero := map[string]bool{
				"A": true,
				"B": true,
			}
			got, err := processResults(tt.results, expression, canDefaultZero)
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

func TestFormula(t *testing.T) {
	tests := []struct {
		name       string
		expression string
		results    []*v3.Result
		want       *v3.Result
	}{
		{
			name:       "No group keys on the left side",
			expression: "B/A",
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
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							Labels: map[string]string{},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
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
							"service_name": "frontend",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     2.2,
							},
							{
								Timestamp: 2,
								Value:     3.25,
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
								Value:     1.8333333333333333,
							},
							{
								Timestamp: 2,
								Value:     1.4444444444444444,
							},
						},
					},
				},
			},
		},
		{
			name:       "No group keys on the right side",
			expression: "A/B",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-1",
								"state":     "running",
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
								"host_name": "ip-10-420-69-2",
								"state":     "idle",
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
					},
				},
				{
					QueryName: "B",
					Series: []*v3.Series{
						{
							Labels: map[string]string{},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
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
							"host_name": "ip-10-420-69-1",
							"state":     "running",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     0.45454545454545453,
							},
							{
								Timestamp: 2,
								Value:     0.3076923076923077,
							},
						},
					},
					{
						Labels: map[string]string{
							"host_name": "ip-10-420-69-2",
							"state":     "idle",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     0.5454545454545454,
							},
							{
								Timestamp: 2,
								Value:     0.6923076923076923,
							},
						},
					},
				},
			},
		},
		{
			name:       "Group keys on both sides are the same",
			expression: "A/B",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-1",
								"state":     "running",
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
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
								{
									Timestamp: 7,
									Value:     70,
								},
							},
						},
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-2",
								"state":     "idle",
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
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
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
								"host_name": "ip-10-420-69-1",
								"state":     "running",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
								},
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
							},
						},
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-2",
								"state":     "idle",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
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
							"host_name": "ip-10-420-69-1",
							"state":     "running",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     float64(10) / float64(22),
							},
							{
								Timestamp: 2,
								Value:     0.3076923076923077,
							},
							{
								Timestamp: 3,
								Value:     0,
							},
							{
								Timestamp: 4,
								Value:     1,
							},
							{
								Timestamp: 5,
								Value:     1,
							},
						},
					},
					{
						Labels: map[string]string{
							"host_name": "ip-10-420-69-2",
							"state":     "idle",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     0.5454545454545454,
							},
							{
								Timestamp: 2,
								Value:     0.6923076923076923,
							},
							{
								Timestamp: 4,
								Value:     1,
							},
							{
								Timestamp: 5,
								Value:     1,
							},
						},
					},
				},
			},
		},
		{
			name:       "Group keys on both sides are same but different values",
			expression: "A/B",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-1",
								"state":     "running",
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
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
								{
									Timestamp: 7,
									Value:     70,
								},
							},
						},
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-2",
								"state":     "idle",
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
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
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
								"host_name": "ip-10-420-69-1",
								"state":     "not_running_chalamet",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
								},
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
							},
						},
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-2",
								"state":     "busy",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
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
							"host_name": "ip-10-420-69-1",
							"state":     "not_running_chalamet",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     0,
							},
							{
								Timestamp: 2,
								Value:     0,
							},
							{
								Timestamp: 3,
								Value:     0,
							},
							{
								Timestamp: 4,
								Value:     0,
							},
							{
								Timestamp: 5,
								Value:     0,
							},
						},
					},
					{
						Labels: map[string]string{
							"host_name": "ip-10-420-69-2",
							"state":     "busy",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     0,
							},
							{
								Timestamp: 2,
								Value:     0,
							},
							{
								Timestamp: 4,
								Value:     0,
							},
							{
								Timestamp: 5,
								Value:     0,
							},
						},
					},
				},
			},
		},
		{
			name:       "Group keys on the left side are a superset of the right side",
			expression: "A/B",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-1",
								"state":     "running",
								"os.type":   "linux",
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
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
								{
									Timestamp: 7,
									Value:     70,
								},
							},
						},
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-2",
								"state":     "idle",
								"os.type":   "linux",
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
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
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
								"state":   "running",
								"os.type": "linux",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
								},
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
							},
						},
						{
							Labels: map[string]string{
								"state":   "busy",
								"os.type": "linux",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
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
							"host_name": "ip-10-420-69-1",
							"state":     "running",
							"os.type":   "linux",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     float64(10) / float64(22),
							},
							{
								Timestamp: 2,
								Value:     0.3076923076923077,
							},
							{
								Timestamp: 3,
								Value:     0,
							},
							{
								Timestamp: 4,
								Value:     1,
							},
							{
								Timestamp: 5,
								Value:     1,
							},
						},
					},
					{
						Labels: map[string]string{
							"state":   "busy",
							"os.type": "linux",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     0,
							},
							{
								Timestamp: 2,
								Value:     0,
							},
							{
								Timestamp: 4,
								Value:     0,
							},
							{
								Timestamp: 5,
								Value:     0,
							},
						},
					},
				},
			},
		},
		{
			name:       "Group keys are subsets, A is a subset of B and their result is a subset of C",
			expression: "A/B + C",
			results: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"state": "running",
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
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
								{
									Timestamp: 7,
									Value:     70,
								},
							},
						},
						{
							Labels: map[string]string{
								"state": "idle",
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
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
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
								"host_name": "ip-10-420-69-1",
								"state":     "running",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
								},
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
							},
						},
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-2",
								"state":     "idle",
							},
							Points: []v3.Point{
								{
									Timestamp: 1,
									Value:     22,
								},
								{
									Timestamp: 2,
									Value:     65,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
							},
						},
					},
				},
				{
					QueryName: "C",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-1",
								"state":     "running",
								"os.type":   "linux",
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
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
								},
								{
									Timestamp: 7,
									Value:     70,
								},
							},
						},
						{
							Labels: map[string]string{
								"host_name": "ip-10-420-69-2",
								"state":     "idle",
								"os.type":   "linux",
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
								{
									Timestamp: 3,
									Value:     30,
								},
								{
									Timestamp: 4,
									Value:     40,
								},
								{
									Timestamp: 5,
									Value:     50,
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
							"host_name": "ip-10-420-69-1",
							"state":     "running",
							"os.type":   "linux",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     10.45454545454545453,
							},
							{
								Timestamp: 2,
								Value:     20.3076923076923077,
							},
							{
								Timestamp: 3,
								Value:     0,
							},
							{
								Timestamp: 4,
								Value:     41,
							},
							{
								Timestamp: 5,
								Value:     51,
							},
						},
					},
					{
						Labels: map[string]string{
							"host_name": "ip-10-420-69-2",
							"state":     "idle",
							"os.type":   "linux",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     12.5454545454545454,
							},
							{
								Timestamp: 2,
								Value:     45.6923076923076923,
							},
							{
								Timestamp: 4,
								Value:     41,
							},
							{
								Timestamp: 5,
								Value:     51,
							},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expression, err := govaluate.NewEvaluableExpression(tt.expression)
			if err != nil {
				t.Errorf("Error parsing expression: %v", err)
				return
			}
			canDefaultZero := map[string]bool{
				"A": true,
				"B": true,
				"C": true,
			}
			got, err := processResults(tt.results, expression, canDefaultZero)
			if err != nil {
				t.Errorf("Error processing results: %v", err)
				return
			}
			if len(got.Series) != len(tt.want.Series) {
				t.Errorf("processResults(): number of series - got = %v, want %v", len(got.Series), len(tt.want.Series))
				return
			}

			for i := range got.Series {
				if len(got.Series[i].Points) != len(tt.want.Series[i].Points) {
					t.Errorf("processResults(): number of points - got = %v, want %v", len(got.Series[i].Points), len(tt.want.Series[i].Points))
					return
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

func TestProcessResultsNoDefaultZero(t *testing.T) {
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
			canDefaultZero := map[string]bool{
				"A": false,
				"B": false,
			}
			got, err := processResults(tt.results, expression, canDefaultZero)
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

func TestProcessResultsMixedQueries(t *testing.T) {
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
					QueryName: "C",
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
									Timestamp: 2,
									Value:     50,
								},
								{
									Timestamp: 3,
									Value:     45,
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
							"service_name": "frontend",
							"operation":    "GET /api",
						},
						Points: []v3.Point{
							{
								Timestamp: 1,
								Value:     1,
							},
							{
								Timestamp: 2,
								Value:     1,
							},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expression, err := govaluate.NewEvaluableExpression("A / B")
			if err != nil {
				t.Errorf("Error parsing expression: %v", err)
			}
			canDefaultZero := map[string]bool{
				"A": true,
				"B": true,
				"C": true,
			}
			got, err := processResults(tt.results, expression, canDefaultZero)
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
