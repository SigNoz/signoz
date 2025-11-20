package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/model"
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
			errMsg:      "operation alter table is not allowed",
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

func TestAnalyzeQueryFilter(t *testing.T) {
	// Create a minimal APIHandler for testing
	// The analyzeQueryFilter handler doesn't use any APIHandler fields, so we can use an empty struct
	aH := &APIHandler{}

	tests := []struct {
		name              string
		requestBody       QueryFilterAnalyzeRequest
		expectedStatus    int
		expectedStatusStr string
		expectedError     bool
		errorContains     string
		expectedMetrics   []string
		expectedGroups    []string
	}{
		{
			name: "PromQL - Nested aggregation inside subquery",
			requestBody: QueryFilterAnalyzeRequest{
				Query:     `max_over_time(sum(rate(cpu_usage_total[5m]))[1h:5m])`,
				QueryType: "promql",
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"cpu_usage_total"},
			expectedGroups:    []string{},
		},
		{
			name: "PromQL - Subquery with multiple metrics",
			requestBody: QueryFilterAnalyzeRequest{
				Query:     `avg_over_time((foo + bar)[10m:1m])`,
				QueryType: "promql",
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"bar", "foo"},
			expectedGroups:    []string{},
		},
		{
			name: "PromQL - Simple meta-metric with grouping",
			requestBody: QueryFilterAnalyzeRequest{
				Query:     `sum by (pod) (up)`,
				QueryType: "promql",
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"up"},
			expectedGroups:    []string{"pod"},
		},
		{
			name: "ClickHouse - Simple CTE with GROUP BY",
			requestBody: QueryFilterAnalyzeRequest{
				Query: `WITH aggregated AS (
					SELECT region as region_alias, sum(value) AS total
					FROM metrics
					WHERE metric_name = 'cpu_usage'
					GROUP BY region
				)
				SELECT * FROM aggregated`,
				QueryType: "clickhouse_sql",
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"cpu_usage"},
			expectedGroups:    []string{"region_alias"},
		},
		{
			name: "ClickHouse - CTE chain with last GROUP BY + Alias should be returned if exists",
			requestBody: QueryFilterAnalyzeRequest{
				Query: `WITH step1 AS (
					SELECT service as service_alias, timestamp as ts, value
					FROM metrics
					WHERE metric_name = 'requests'
					GROUP BY service, timestamp
				),
				step2 AS (
					SELECT ts, avg(value) AS avg_value
					FROM step1
					GROUP BY ts
				)
				SELECT * FROM step2`,
				QueryType: "clickhouse_sql",
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"requests"},
			expectedGroups:    []string{"ts"},
		},
		{
			name: "ClickHouse - Outer GROUP BY overrides CTE GROUP BY + Alias should be returned if exists",
			requestBody: QueryFilterAnalyzeRequest{
				Query: `WITH cte AS (
					SELECT region, service, value
					FROM metrics
					WHERE metric_name = 'memory'
					GROUP BY region, service
				)
				SELECT region as region_alias, sum(value) as total
				FROM cte
				GROUP BY region`,
				QueryType: "clickhouse_sql",
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"memory"},
			expectedGroups:    []string{"region_alias"},
		},
		{
			name: "ClickHouse - Invalid query should return error",
			requestBody: QueryFilterAnalyzeRequest{
				Query:     `SELECT WHERE metric_name = 'memory' GROUP BY region, service`,
				QueryType: "clickhouse_sql",
			},
			expectedStatus:    http.StatusBadRequest,
			expectedStatusStr: "error",
			expectedError:     true,
			errorContains:     "failed to parse clickhouse query",
		},
		{
			name: "Empty query should return error",
			requestBody: QueryFilterAnalyzeRequest{
				Query:     "",
				QueryType: "promql",
			},
			expectedStatus:    http.StatusBadRequest,
			expectedStatusStr: "error",
			expectedError:     true,
			errorContains:     "query is required and cannot be empty",
		},
		{
			name: "Invalid queryType should return error",
			requestBody: QueryFilterAnalyzeRequest{
				Query:     `sum(rate(cpu_usage[5m]))`,
				QueryType: "invalid_type",
			},
			expectedStatus:    http.StatusBadRequest,
			expectedStatusStr: "error",
			expectedError:     true,
			errorContains:     "unsupported queryType",
		},
		{
			name: "Invalid PromQL syntax should return error",
			requestBody: QueryFilterAnalyzeRequest{
				Query:     `sum by ((foo)(bar))(http_requests_total)`,
				QueryType: "promql",
			},
			expectedStatus:    http.StatusBadRequest,
			expectedStatusStr: "error",
			expectedError:     true,
			errorContains:     "failed to parse promql query",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request body
			reqBody, err := json.Marshal(tt.requestBody)
			if err != nil {
				t.Fatalf("failed to marshal request body: %v", err)
			}

			// Create HTTP request
			req := httptest.NewRequest(http.MethodPost, "/api/v1/query_filter/analyze", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			// Create response recorder
			rr := httptest.NewRecorder()

			// Call handler
			aH.analyzeQueryFilter(rr, req)

			// Check status code
			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			// Parse response
			var resp map[string]interface{}
			if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
				t.Fatalf("failed to unmarshal response: %v, body: %s", err, rr.Body.String())
			}

			// Check status string
			if resp["status"] != tt.expectedStatusStr {
				t.Errorf("expected status '%s', got %v", tt.expectedStatusStr, resp["status"])
			}

			if tt.expectedError {
				errorObj, ok := resp["error"].(map[string]interface{})
				if !ok {
					t.Fatalf("expected error to be a map, got %T", resp["error"])
				}
				errorMsg, ok := errorObj["message"].(string)
				if !ok {
					t.Fatalf("expected error message to be a string, got %T", errorObj["message"])
				}
				if !strings.Contains(errorMsg, tt.errorContains) {
					t.Errorf("expected error message to contain '%s', got '%s'", tt.errorContains, errorMsg)
				}
			} else {
				// Validate success response
				data, ok := resp["data"].(map[string]interface{})
				if !ok {
					t.Fatalf("expected data to be a map, got %T", resp["data"])
				}

				// Marshal data back to JSON and unmarshal into QueryFilterAnalyzeResponse struct
				dataBytes, err := json.Marshal(data)
				if err != nil {
					t.Fatalf("failed to marshal data: %v", err)
				}

				var responseData QueryFilterAnalyzeResponse
				if err := json.Unmarshal(dataBytes, &responseData); err != nil {
					t.Fatalf("failed to unmarshal data into QueryFilterAnalyzeResponse: %v", err)
				}

				// Sort the arrays for comparison
				gotMetrics := make([]string, len(responseData.MetricNames))
				copy(gotMetrics, responseData.MetricNames)
				sort.Strings(gotMetrics)

				gotGroups := make([]string, len(responseData.Groups))
				copy(gotGroups, responseData.Groups)
				sort.Strings(gotGroups)

				// Compare using deep equal
				if !reflect.DeepEqual(gotMetrics, tt.expectedMetrics) {
					t.Errorf("expected metricNames %v, got %v", tt.expectedMetrics, gotMetrics)
				}
				if !reflect.DeepEqual(gotGroups, tt.expectedGroups) {
					t.Errorf("expected groups %v, got %v", tt.expectedGroups, gotGroups)
				}
			}
		})
	}
}
