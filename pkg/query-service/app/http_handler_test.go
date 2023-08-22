package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestPrepareQuery(t *testing.T) {
	type testCase struct {
		name        string
		postData    *model.DashboardVars
		query       string
		expectedErr bool
		errMsg      string
	}

	testCases := []testCase{
		{
			name: "test empty query",
			postData: &model.DashboardVars{
				Query: "",
			},
			expectedErr: true,
			errMsg:      "query is required",
		},
		{
			name: "test query with no variables",
			postData: &model.DashboardVars{
				Query: "select * from table",
			},
			expectedErr: false,
			query:       "select * from table",
		},
		{
			name: "test query with variables",
			postData: &model.DashboardVars{
				Query: "select * from table where id = {{.id}}",
				Variables: map[string]interface{}{
					"id": "1",
				},
			},
			query:       "select * from table where id = '1'",
			expectedErr: false,
		},
		// While this does seem like it should throw error, it shouldn't because empty value is a valid value
		// for certain scenarios and should be treated as such.
		{
			name: "test query with variables and no value",
			postData: &model.DashboardVars{
				Query: "select * from table where id = {{.id}}",
				Variables: map[string]interface{}{
					"id": "",
				},
			},
			query:       "select * from table where id = ''",
			expectedErr: false,
		},
		{
			name: "query contains alter table",
			postData: &model.DashboardVars{
				Query: "ALTER TABLE signoz_table DELETE where true",
			},
			expectedErr: true,
			errMsg:      "Operation alter table is not allowed",
		},
		{
			name: "query text produces template exec error",
			postData: &model.DashboardVars{
				Query: "SELECT durationNano from signoz_traces.signoz_index_v2 WHERE id = {{if .X}}1{{else}}2{{else}}3{{end}}",
			},
			expectedErr: true,
			errMsg:      "expected end; found {{else}}",
		},
		{
			name: "variables contain array",
			postData: &model.DashboardVars{
				Query: "SELECT operation FROM table WHERE serviceName IN {{.serviceName}}",
				Variables: map[string]interface{}{
					"serviceName": []string{"frontend", "route"},
				},
			},
			query: "SELECT operation FROM table WHERE serviceName IN ['frontend','route']",
		},
		{
			name: "query uses mixed types of variables",
			postData: &model.DashboardVars{
				Query: "SELECT body FROM table Where id = {{.id}} AND elapsed_time >= {{.elapsed_time}} AND serviceName IN {{.serviceName}}",
				Variables: map[string]interface{}{
					"serviceName":  []string{"frontend", "route"},
					"id":           "id",
					"elapsed_time": 1.24,
				},
			},
			query: "SELECT body FROM table Where id = 'id' AND elapsed_time >= 1.240000 AND serviceName IN ['frontend','route']",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var b bytes.Buffer
			err := json.NewEncoder(&b).Encode(tc.postData)
			if err != nil {
				t.Fatal(err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v2/variables/query", &b)
			query, err := prepareQuery(req)

			if tc.expectedErr {
				if err == nil {
					t.Errorf("expected error, but got nil")
				}
				if !strings.Contains(err.Error(), tc.errMsg) {
					t.Errorf("expected error message contain: %s, but got: %s", tc.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("expected no error, but got: %s", err.Error())
				}
				if query != tc.query {
					t.Errorf("expected query: %s, but got: %s", tc.query, query)
				}
			}
		})
	}
}

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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     19.3,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     19.3,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     19.3,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     154.5,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     340,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     154.5,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     340,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     19.3,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     19.3,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     19.3,
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
							GroupingSetsPoint: &v3.Point{
								Timestamp: 0,
								Value:     8.83,
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
			applyMetricLimit(result, c.params)
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
