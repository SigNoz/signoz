package postprocess

import (
	"reflect"
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestPostProcessResult(t *testing.T) {
	testCases := []struct {
		name             string
		results          []*v3.Result
		queryRangeParams *v3.QueryRangeParamsV3
		want             []*v3.Result
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
			want: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
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
				{
					QueryName: "F1",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "redis",
							},
							LabelsArray: []map[string]string{
								{
									"service_name": "redis",
								},
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
			queryRangeParams: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							DataSource: v3.DataSourceMetrics,
							QueryName:  "A",
							Expression: "A",
						},
						"B": {
							DataSource: v3.DataSourceMetrics,
							QueryName:  "B",
							Expression: "B",
						},
						"F1": {
							Expression: "B/A",
							QueryName:  "F1",
							Limit:      1,
						},
					},
				},
			},
		},
	}
	for _, tt := range testCases {
		t.Run(tt.name, func(t *testing.T) {
			got, err := PostProcessResult(tt.results, tt.queryRangeParams)
			if err != nil {
				t.Errorf("PostProcessResult() error = %v", err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("PostProcessResult() = %v, want %v", got, tt.want)
			}
		})
	}
}
