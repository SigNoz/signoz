package queryparser

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/parsertypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func TestAPI_AnalyzeQueryFilter(t *testing.T) {
	queryParser := New(instrumentationtest.New().ToProviderSettings())
	aH := NewAPI(instrumentationtest.New().ToProviderSettings(), queryParser)

	tests := []struct {
		name              string
		requestBody       parsertypes.QueryFilterAnalyzeRequest
		expectedStatus    int
		expectedStatusStr string
		expectedError     bool
		errorContains     string
		expectedMetrics   []string
		expectedGroups    []parsertypes.ColumnInfoResponse
	}{
		{
			name: "PromQL - Nested aggregation inside subquery",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query:     `max_over_time(sum(rate(cpu_usage_total[5m]))[1h:5m])`,
				QueryType: querybuildertypesv5.QueryTypePromQL,
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"cpu_usage_total"},
			expectedGroups:    []parsertypes.ColumnInfoResponse{},
		},
		{
			name: "PromQL - Subquery with multiple metrics",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query:     `avg_over_time((foo + bar)[10m:1m])`,
				QueryType: querybuildertypesv5.QueryTypePromQL,
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"bar", "foo"},
			expectedGroups:    []parsertypes.ColumnInfoResponse{},
		},
		{
			name: "PromQL - Simple meta-metric with grouping",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query:     `sum by (pod) (up)`,
				QueryType: querybuildertypesv5.QueryTypePromQL,
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"up"},
			expectedGroups:    []parsertypes.ColumnInfoResponse{{Name: "pod", Alias: ""}},
		},
		{
			name: "ClickHouse - Simple CTE with GROUP BY",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query: `WITH aggregated AS (
					SELECT region as region_alias, sum(value) AS total
					FROM metrics
					WHERE metric_name = 'cpu_usage'
					GROUP BY region
				)
				SELECT * FROM aggregated`,
				QueryType: querybuildertypesv5.QueryTypeClickHouseSQL,
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"cpu_usage"},
			expectedGroups:    []parsertypes.ColumnInfoResponse{{Name: "region", Alias: "region_alias"}},
		},
		{
			name: "ClickHouse - CTE chain with last GROUP BY + Alias should be returned if exists",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
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
				QueryType: querybuildertypesv5.QueryTypeClickHouseSQL,
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"requests"},
			expectedGroups:    []parsertypes.ColumnInfoResponse{{Name: "ts", Alias: ""}},
		},
		{
			name: "ClickHouse - Outer GROUP BY overrides CTE GROUP BY + Alias should be returned if exists",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query: `WITH cte AS (
					SELECT region, service, value
					FROM metrics
					WHERE metric_name = 'memory'
					GROUP BY region, service
				)
				SELECT region as region_alias, sum(value) as total
				FROM cte
				GROUP BY region`,
				QueryType: querybuildertypesv5.QueryTypeClickHouseSQL,
			},
			expectedStatus:    http.StatusOK,
			expectedStatusStr: "success",
			expectedError:     false,
			expectedMetrics:   []string{"memory"},
			expectedGroups:    []parsertypes.ColumnInfoResponse{{Name: "region", Alias: "region_alias"}},
		},
		{
			name: "ClickHouse - Invalid query should return error",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query:     `SELECT WHERE metric_name = 'memory' GROUP BY region, service`,
				QueryType: querybuildertypesv5.QueryTypeClickHouseSQL,
			},
			expectedStatus:    http.StatusBadRequest,
			expectedStatusStr: "error",
			expectedError:     true,
			errorContains:     "failed to parse clickhouse query",
		},
		{
			name: "Empty query should return error",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query:     "",
				QueryType: querybuildertypesv5.QueryTypePromQL,
			},
			expectedStatus:    http.StatusBadRequest,
			expectedStatusStr: "error",
			expectedError:     true,
			errorContains:     "query is required and cannot be empty",
		},
		{
			name: "Invalid queryType should return error",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query:     `sum(rate(cpu_usage[5m]))`,
				QueryType: querybuildertypesv5.QueryTypeUnknown,
			},
			expectedStatus:    http.StatusBadRequest,
			expectedStatusStr: "error",
			expectedError:     true,
			errorContains:     "unsupported queryType",
		},
		{
			name: "Invalid PromQL syntax should return error",
			requestBody: parsertypes.QueryFilterAnalyzeRequest{
				Query:     `sum by ((foo)(bar))(http_requests_total)`,
				QueryType: querybuildertypesv5.QueryTypePromQL,
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
			req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/v1/query_filter/analyze", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			// Create response recorder
			rr := httptest.NewRecorder()

			// Call handler
			aH.AnalyzeQueryFilter(rr, req)

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

				var responseData parsertypes.QueryFilterAnalyzeResponse
				if err := json.Unmarshal(dataBytes, &responseData); err != nil {
					t.Fatalf("failed to unmarshal data into QueryFilterAnalyzeResponse: %v", err)
				}

				// Sort the arrays for comparison
				gotMetrics := make([]string, len(responseData.MetricNames))
				copy(gotMetrics, responseData.MetricNames)
				sort.Strings(gotMetrics)

				gotGroups := make([]parsertypes.ColumnInfoResponse, len(responseData.Groups))
				copy(gotGroups, responseData.Groups)

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
