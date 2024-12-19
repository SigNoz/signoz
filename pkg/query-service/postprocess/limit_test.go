package postprocess

import (
	"testing"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestApplyLimitOnMetricResult(t *testing.T) {
	cases := []struct {
		name           string
		inputResult    []*v3.Result
		params         *v3.QueryRangeParamsV3
		expectedResult []*v3.Result
	}{
		{
			name: "test limit 1 without order", // top most (latency/error) as default
			inputResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     19.2,
								},
								{
									Timestamp: 1689220096000,
									Value:     19.5,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "route",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1689220036000,
				End:   1689220096000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							AggregateAttribute: v3.AttributeKey{Key: "signo_calls_total"},
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							GroupBy:            []v3.AttributeKey{{Key: "service_name"}},
							Limit:              1,
						},
					},
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
				},
			},
			expectedResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     19.2,
								},
								{
									Timestamp: 1689220096000,
									Value:     19.5,
								},
							},
						},
					},
				},
			},
		},
		{
			name: "test limit with order asc",
			inputResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     19.2,
								},
								{
									Timestamp: 1689220096000,
									Value:     19.5,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "route",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1689220036000,
				End:   1689220096000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							AggregateAttribute: v3.AttributeKey{Key: "signo_calls_total"},
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							GroupBy:            []v3.AttributeKey{{Key: "service_name"}},
							Limit:              1,
							OrderBy:            []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "asc"}},
						},
					},
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
				},
			},
			expectedResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "route",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
					},
				},
			},
		},
		{
			name: "test data source not metrics",
			inputResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     69,
								},
								{
									Timestamp: 1689220096000,
									Value:     240,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "redis",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     420,
								},
								{
									Timestamp: 1689220096000,
									Value:     260,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1689220036000,
				End:   1689220096000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							AggregateAttribute: v3.AttributeKey{Key: "service_name"},
							DataSource:         v3.DataSourceTraces,
							AggregateOperator:  v3.AggregateOperatorSum,
							Expression:         "A",
							GroupBy:            []v3.AttributeKey{{Key: "service_name"}},
							Limit:              1,
							OrderBy:            []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "asc"}},
						},
					},
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
				},
			},
			expectedResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     69,
								},
								{
									Timestamp: 1689220096000,
									Value:     240,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "redis",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     420,
								},
								{
									Timestamp: 1689220096000,
									Value:     260,
								},
							},
						},
					},
				},
			},
		},
		{
			// ["GET /api/v1/health", "DELETE /api/v1/health"] so result should be ["DELETE /api/v1/health"] although it has lower value
			name: "test limit with operation asc",
			inputResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
								"operation":    "GET /api/v1/health",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     19.2,
								},
								{
									Timestamp: 1689220096000,
									Value:     19.5,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "route",
								"operation":    "DELETE /api/v1/health",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1689220036000,
				End:   1689220096000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							AggregateAttribute: v3.AttributeKey{Key: "signo_calls_total"},
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							GroupBy:            []v3.AttributeKey{{Key: "service_name"}},
							Limit:              1,
							OrderBy:            []v3.OrderBy{{ColumnName: "operation", Order: "asc"}},
						},
					},
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
				},
			},
			expectedResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "route",
								"operation":    "DELETE /api/v1/health",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
					},
				},
			},
		},
		{
			name: "test limit with multiple order by labels",
			inputResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
								"operation":    "GET /api/v1/health",
								"status_code":  "200",
								"priority":     "P0",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     19.2,
								},
								{
									Timestamp: 1689220096000,
									Value:     19.5,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "route",
								"operation":    "DELETE /api/v1/health",
								"status_code":  "301",
								"priority":     "P1",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "route",
								"operation":    "DELETE /api/v1/health",
								"status_code":  "400",
								"priority":     "P0",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "route",
								"operation":    "DELETE /api/v1/health",
								"status_code":  "200",
								"priority":     "P1",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
					},
				},
			},
			params: &v3.QueryRangeParamsV3{
				Start: 1689220036000,
				End:   1689220096000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							AggregateAttribute: v3.AttributeKey{Key: "signo_calls_total"},
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation"}, {Key: "status_code"}, {Key: "priority"}},
							Limit:              2,
							OrderBy: []v3.OrderBy{
								{ColumnName: "priority", Order: "asc"},
								{ColumnName: "status_code", Order: "desc"},
							},
						},
					},
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
				},
			},
			expectedResult: []*v3.Result{
				{
					QueryName: "A",
					Series: []*v3.Series{
						{
							Labels: map[string]string{
								"service_name": "frontend",
								"operation":    "GET /api/v1/health",
								"status_code":  "200",
								"priority":     "P0",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     19.2,
								},
								{
									Timestamp: 1689220096000,
									Value:     19.5,
								},
							},
						},
						{
							Labels: map[string]string{
								"service_name": "route",
								"operation":    "DELETE /api/v1/health",
								"status_code":  "400",
								"priority":     "P0",
							},
							Points: []v3.Point{
								{
									Timestamp: 1689220036000,
									Value:     8.83,
								},
								{
									Timestamp: 1689220096000,
									Value:     8.83,
								},
							},
						},
					},
				},
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			result := c.inputResult
			ApplyMetricLimit(result, c.params)
			if len(result) != len(c.expectedResult) {
				t.Errorf("expected result length: %d, but got: %d", len(c.expectedResult), len(result))
			}
			for i, r := range result {
				if r.QueryName != c.expectedResult[i].QueryName {
					t.Errorf("expected query name: %s, but got: %s", c.expectedResult[i].QueryName, r.QueryName)
				}
				if len(r.Series) != len(c.expectedResult[i].Series) {
					t.Errorf("expected series length: %d, but got: %d", len(c.expectedResult[i].Series), len(r.Series))
				}
				for j, s := range r.Series {
					if len(s.Points) != len(c.expectedResult[i].Series[j].Points) {
						t.Errorf("expected points length: %d, but got: %d", len(c.expectedResult[i].Series[j].Points), len(s.Points))
					}
					for k, p := range s.Points {
						if p.Timestamp != c.expectedResult[i].Series[j].Points[k].Timestamp {
							t.Errorf("expected point timestamp: %d, but got: %d", c.expectedResult[i].Series[j].Points[k].Timestamp, p.Timestamp)
						}
						if p.Value != c.expectedResult[i].Series[j].Points[k].Value {
							t.Errorf("expected point value: %f, but got: %f", c.expectedResult[i].Series[j].Points[k].Value, p.Value)
						}
					}
				}
			}
		})
	}
}
