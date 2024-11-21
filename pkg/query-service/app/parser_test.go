package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/common"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestParseAggregateAttrReques(t *testing.T) {
	reqCases := []struct {
		desc               string
		queryString        string
		expectedOperator   v3.AggregateOperator
		expectedDataSource v3.DataSource
		expectedLimit      int
		expectedSearchText string
		expectErr          bool
		errMsg             string
	}{
		{
			desc:               "valid operator and data source",
			queryString:        "aggregateOperator=sum&dataSource=metrics&searchText=abc",
			expectedOperator:   v3.AggregateOperatorSum,
			expectedDataSource: v3.DataSourceMetrics,
			expectedLimit:      50,
			expectedSearchText: "abc",
		},
		{
			desc:               "different valid operator and data source as logs",
			queryString:        "aggregateOperator=avg&dataSource=logs&searchText=abc",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceLogs,
			expectedLimit:      50,
			expectedSearchText: "abc",
		},
		{
			desc:               "different valid operator and with default search text and limit",
			queryString:        "aggregateOperator=avg&dataSource=metrics",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceMetrics,
			expectedLimit:      50,
			expectedSearchText: "",
		},
		{
			desc:               "valid operator and data source with limit",
			queryString:        "aggregateOperator=avg&dataSource=traces&limit=10",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceTraces,
			expectedLimit:      10,
			expectedSearchText: "",
		},
		{
			desc:        "invalid operator",
			queryString: "aggregateOperator=avg1&dataSource=traces&limit=10",
			expectErr:   true,
			errMsg:      "invalid operator",
		},
		{
			desc:        "invalid data source",
			queryString: "aggregateOperator=avg&dataSource=traces1&limit=10",
			expectErr:   true,
			errMsg:      "invalid data source",
		},
		{
			desc:               "invalid limit",
			queryString:        "aggregateOperator=avg&dataSource=traces&limit=abc",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceTraces,
			expectedLimit:      50,
		},
	}

	for _, reqCase := range reqCases {
		r := httptest.NewRequest("GET", "/api/v3/autocomplete/aggregate_attributes?"+reqCase.queryString, nil)
		aggregateAttrRequest, err := parseAggregateAttributeRequest(r)
		if reqCase.expectErr {
			if err == nil {
				t.Errorf("expected error: %s", reqCase.errMsg)
			}
			if !strings.Contains(err.Error(), reqCase.errMsg) {
				t.Errorf("expected error to contain: %s, got: %s", reqCase.errMsg, err.Error())
			}
			continue
		}
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		assert.Equal(t, reqCase.expectedOperator, aggregateAttrRequest.Operator)
		assert.Equal(t, reqCase.expectedDataSource, aggregateAttrRequest.DataSource)
		assert.Equal(t, reqCase.expectedLimit, aggregateAttrRequest.Limit)
		assert.Equal(t, reqCase.expectedSearchText, aggregateAttrRequest.SearchText)
	}
}

func TestParseFilterAttributeKeyRequest(t *testing.T) {
	reqCases := []struct {
		desc               string
		queryString        string
		expectedOperator   v3.AggregateOperator
		expectedDataSource v3.DataSource
		expectedAggAttr    string
		expectedLimit      int
		expectedSearchText string
		expectErr          bool
		errMsg             string
	}{
		{
			desc:               "valid operator and data source",
			queryString:        "aggregateOperator=sum&dataSource=metrics&aggregateAttribute=metric_name&searchText=abc",
			expectedOperator:   v3.AggregateOperatorSum,
			expectedDataSource: v3.DataSourceMetrics,
			expectedAggAttr:    "metric_name",
			expectedLimit:      50,
			expectedSearchText: "abc",
		},
		{
			desc:               "different valid operator and data source as logs",
			queryString:        "aggregateOperator=avg&dataSource=logs&aggregateAttribute=bytes&searchText=abc",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceLogs,
			expectedAggAttr:    "bytes",
			expectedLimit:      50,
			expectedSearchText: "abc",
		},
		{
			desc:               "different valid operator and with default search text and limit",
			queryString:        "aggregateOperator=avg&dataSource=metrics&aggregateAttribute=metric_name",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceMetrics,
			expectedAggAttr:    "metric_name",
			expectedLimit:      50,
			expectedSearchText: "",
		},
		{
			desc:               "valid operator and data source with limit",
			queryString:        "aggregateOperator=avg&dataSource=traces&aggregateAttribute=http.req.duration&limit=10",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedAggAttr:    "http.req.duration",
			expectedDataSource: v3.DataSourceTraces,
			expectedLimit:      10,
			expectedSearchText: "",
		},
		{
			desc:        "invalid operator",
			queryString: "aggregateOperator=avg1&dataSource=traces&limit=10",
			expectErr:   true,
			errMsg:      "invalid operator",
		},
		{
			desc:        "invalid data source",
			queryString: "aggregateOperator=avg&dataSource=traces1&limit=10",
			expectErr:   true,
			errMsg:      "invalid data source",
		},
		{
			desc:               "invalid limit",
			queryString:        "aggregateOperator=avg&dataSource=traces&limit=abc",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceTraces,
			expectedLimit:      50,
		},
	}

	for _, reqCase := range reqCases {
		r := httptest.NewRequest("GET", "/api/v3/autocomplete/filter_attributes?"+reqCase.queryString, nil)
		filterAttrRequest, err := parseFilterAttributeKeyRequest(r)
		if reqCase.expectErr {
			if err == nil {
				t.Errorf("expected error: %s", reqCase.errMsg)
			}
			if !strings.Contains(err.Error(), reqCase.errMsg) {
				t.Errorf("expected error to contain: %s, got: %s", reqCase.errMsg, err.Error())
			}
			continue
		}
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		assert.Equal(t, reqCase.expectedOperator, filterAttrRequest.AggregateOperator)
		assert.Equal(t, reqCase.expectedDataSource, filterAttrRequest.DataSource)
		assert.Equal(t, reqCase.expectedAggAttr, filterAttrRequest.AggregateAttribute)
		assert.Equal(t, reqCase.expectedLimit, filterAttrRequest.Limit)
		assert.Equal(t, reqCase.expectedSearchText, filterAttrRequest.SearchText)
	}
}

func TestParseFilterAttributeValueRequest(t *testing.T) {
	reqCases := []struct {
		desc               string
		queryString        string
		expectedOperator   v3.AggregateOperator
		expectedDataSource v3.DataSource
		expectedAggAttr    string
		expectedFilterAttr string
		expectedLimit      int
		expectedSearchText string
		expectErr          bool
		errMsg             string
	}{
		{
			desc:               "valid operator and data source",
			queryString:        "aggregateOperator=sum&dataSource=metrics&aggregateAttribute=metric_name&attributeKey=service_name&searchText=abc",
			expectedOperator:   v3.AggregateOperatorSum,
			expectedDataSource: v3.DataSourceMetrics,
			expectedAggAttr:    "metric_name",
			expectedFilterAttr: "service_name",
			expectedLimit:      50,
			expectedSearchText: "abc",
		},
		{
			desc:               "different valid operator and data source as logs",
			queryString:        "aggregateOperator=avg&dataSource=logs&aggregateAttribute=bytes&attributeKey=service_name&searchText=abc",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceLogs,
			expectedAggAttr:    "bytes",
			expectedFilterAttr: "service_name",
			expectedLimit:      50,
			expectedSearchText: "abc",
		},
		{
			desc:               "different valid operator and with default search text and limit",
			queryString:        "aggregateOperator=avg&dataSource=metrics&aggregateAttribute=metric_name&attributeKey=service_name",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceMetrics,
			expectedAggAttr:    "metric_name",
			expectedFilterAttr: "service_name",
			expectedLimit:      50,
			expectedSearchText: "",
		},
		{
			desc:               "valid operator and data source with limit",
			queryString:        "aggregateOperator=avg&dataSource=traces&aggregateAttribute=http.req.duration&attributeKey=service_name&limit=10",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedAggAttr:    "http.req.duration",
			expectedFilterAttr: "service_name",
			expectedDataSource: v3.DataSourceTraces,
			expectedLimit:      10,
			expectedSearchText: "",
		},
		{
			desc:        "invalid operator",
			queryString: "aggregateOperator=avg1&dataSource=traces&limit=10",
			expectErr:   true,
			errMsg:      "invalid operator",
		},
		{
			desc:        "invalid data source",
			queryString: "aggregateOperator=avg&dataSource=traces1&limit=10",
			expectErr:   true,
			errMsg:      "invalid data source",
		},
		{
			desc:               "invalid limit",
			queryString:        "aggregateOperator=avg&dataSource=traces&limit=abc",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceTraces,
			expectedLimit:      50,
		},
	}

	for _, reqCase := range reqCases {
		r := httptest.NewRequest("GET", "/api/v3/autocomplete/filter_attribute_values?"+reqCase.queryString, nil)
		filterAttrRequest, err := parseFilterAttributeValueRequest(r)
		if reqCase.expectErr {
			if err == nil {
				t.Errorf("expected error: %s", reqCase.errMsg)
			}
			if !strings.Contains(err.Error(), reqCase.errMsg) {
				t.Errorf("expected error to contain: %s, got: %s", reqCase.errMsg, err.Error())
			}
			continue
		}
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		assert.Equal(t, reqCase.expectedOperator, filterAttrRequest.AggregateOperator)
		assert.Equal(t, reqCase.expectedDataSource, filterAttrRequest.DataSource)
		assert.Equal(t, reqCase.expectedAggAttr, filterAttrRequest.AggregateAttribute)
		assert.Equal(t, reqCase.expectedFilterAttr, filterAttrRequest.FilterAttributeKey)
		assert.Equal(t, reqCase.expectedLimit, filterAttrRequest.Limit)
		assert.Equal(t, reqCase.expectedSearchText, filterAttrRequest.SearchText)
	}
}

func TestParseQueryRangeParamsCompositeQuery(t *testing.T) {
	reqCases := []struct {
		desc           string
		compositeQuery v3.CompositeQuery
		expectErr      bool
		errMsg         string
		hasShiftBy     bool
		shiftBy        int64
	}{
		{
			desc: "no query in request",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeClickHouseSQL,
			},
			expectErr: true,
			errMsg:    "composite query must contain at least one query",
		},
		{
			desc: "invalid panel type",
			compositeQuery: v3.CompositeQuery{
				PanelType: "invalid",
				QueryType: v3.QueryTypeClickHouseSQL,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"A": {
						Query:    "query",
						Disabled: false,
					},
				},
			},
			expectErr: true,
			errMsg:    "panel type is invalid",
		},
		{
			desc: "invalid query type",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: "invalid",
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"A": {
						Query:    "query",
						Disabled: false,
					},
				},
			},
			expectErr: true,
			errMsg:    "query type is invalid",
		},
		{
			desc: "invalid prometheus query",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "",
						Disabled: false,
					},
				},
			},
			expectErr: true,
			errMsg:    "query is empty",
		},
		{
			desc: "invalid clickhouse query",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeClickHouseSQL,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"A": {
						Query:    "",
						Disabled: false,
					},
				},
			},
			expectErr: true,
			errMsg:    "query is empty",
		},
		{
			desc: "invalid prometheus query with disabled query",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "",
						Disabled: true,
					},
				},
			},
			expectErr: true,
			errMsg:    "query is empty",
		},
		{
			desc: "invalid clickhouse query with disabled query",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeClickHouseSQL,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"A": {
						Query:    "",
						Disabled: true,
					},
				},
			},
			expectErr: true,
			errMsg:    "query is empty",
		},
		{
			desc: "valid prometheus query",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "http_calls_total",
						Disabled: false,
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "invalid builder query without query name",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"": {
						QueryName:  "",
						Expression: "A",
					},
				},
			},
			expectErr: true,
			errMsg:    "query name is required",
		},
		{
			desc: "invalid data source for builder query",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:  "A",
						DataSource: "invalid",
						Expression: "A",
					},
				},
			},
			expectErr: true,
			errMsg:    "data source is invalid",
		},
		// {
		// 	desc: "invalid aggregate operator for builder query",
		// 	compositeQuery: v3.CompositeQuery{
		// 		PanelType: v3.PanelTypeGraph,
		// 		QueryType: v3.QueryTypeBuilder,
		// 		BuilderQueries: map[string]*v3.BuilderQuery{
		// 			"A": {
		// 				QueryName:         "A",
		// 				DataSource:        "metrics",
		// 				AggregateOperator: "invalid",
		// 				Expression:        "A",
		// 			},
		// 		},
		// 	},
		// 	expectErr: true,
		// 	errMsg:    "aggregate operator is invalid",
		// },
		{
			desc: "invalid aggregate attribute for builder query",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         "metrics",
						AggregateOperator:  "sum",
						AggregateAttribute: v3.AttributeKey{},
						Expression:         "A",
					},
				},
			},
			expectErr: true,
			errMsg:    "aggregate attribute is required",
		},
		{
			desc: "invalid group by attribute for builder query",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         "logs",
						AggregateOperator:  "sum",
						AggregateAttribute: v3.AttributeKey{Key: "attribute"},
						GroupBy:            []v3.AttributeKey{{Key: ""}},
						Expression:         "A",
					},
				},
			},
			expectErr: true,
			errMsg:    "builder query A is invalid: group by is invalid",
		},
		{
			desc: "builder query with shift by",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         "logs",
						AggregateOperator:  "sum",
						AggregateAttribute: v3.AttributeKey{Key: "attribute"},
						GroupBy:            []v3.AttributeKey{{Key: "group_key"}},
						Expression:         "A",
						Functions: []v3.Function{
							{
								Name: v3.FunctionNameTimeShift,
								Args: []interface{}{float64(10)},
							},
						},
					},
				},
			},
			hasShiftBy: true,
			shiftBy:    10,
		},
		{
			desc: "builder query with shift by as string",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         "logs",
						AggregateOperator:  "sum",
						AggregateAttribute: v3.AttributeKey{Key: "attribute"},
						GroupBy:            []v3.AttributeKey{{Key: "group_key"}},
						Expression:         "A",
						Functions: []v3.Function{
							{
								Name: v3.FunctionNameTimeShift,
								Args: []interface{}{"3600"},
							},
						},
					},
				},
			},
			hasShiftBy: true,
			shiftBy:    3600,
		},
	}

	for _, tc := range reqCases {
		t.Run(tc.desc, func(t *testing.T) {

			queryRangeParams := &v3.QueryRangeParamsV3{
				Start:          time.Now().Add(-time.Hour).UnixMilli(),
				End:            time.Now().UnixMilli(),
				Step:           time.Minute.Microseconds(),
				CompositeQuery: &tc.compositeQuery,
				Variables:      map[string]interface{}{},
			}

			body := &bytes.Buffer{}
			err := json.NewEncoder(body).Encode(queryRangeParams)
			require.NoError(t, err)
			req := httptest.NewRequest(http.MethodPost, "/api/v3/query_range", body)

			params, apiErr := ParseQueryRangeParams(req)
			if tc.expectErr {
				require.Error(t, apiErr)
				require.Contains(t, apiErr.Error(), tc.errMsg)
			} else {
				require.Nil(t, apiErr)
			}
			if tc.hasShiftBy {
				require.Equal(t, tc.shiftBy, params.CompositeQuery.BuilderQueries["A"].ShiftBy)
			}
		})
	}
}

func TestParseQueryRangeParamsExpressions(t *testing.T) {
	reqCases := []struct {
		desc           string
		compositeQuery v3.CompositeQuery
		expectErr      bool
		errMsg         string
	}{
		{
			desc: "invalid expression",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "attribute_metrics"},
						Expression:         "A +",
					},
				},
			},
			expectErr: true,
			errMsg:    "Unexpected end of expression",
		},
		{
			desc: "invalid expression",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceLogs,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "attribute_logs"},
						Expression:         "A",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A + B",
					},
				},
			},
			expectErr: true,
			errMsg:    "unknown variable B",
		},
		{
			desc: "invalid expression",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceLogs,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "attribute_logs"},
						Expression:         "A",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A + B + C",
					},
				},
			},
			expectErr: true,
			errMsg:    "unknown variable B; unknown variable C",
		},
	}

	for _, tc := range reqCases {
		t.Run(tc.desc, func(t *testing.T) {

			queryRangeParams := &v3.QueryRangeParamsV3{
				Start:          time.Now().Add(-time.Hour).UnixMilli(),
				End:            time.Now().UnixMilli(),
				Step:           time.Minute.Microseconds(),
				CompositeQuery: &tc.compositeQuery,
				Variables:      map[string]interface{}{},
			}

			body := &bytes.Buffer{}
			err := json.NewEncoder(body).Encode(queryRangeParams)
			require.NoError(t, err)
			req := httptest.NewRequest(http.MethodPost, "/api/v3/query_range", body)

			_, apiErr := ParseQueryRangeParams(req)
			if tc.expectErr {
				if apiErr == nil {
					t.Fatalf("expected error %s, got nil", tc.errMsg)
				}
				require.Error(t, apiErr)
				require.Contains(t, apiErr.Error(), tc.errMsg)
			} else {
				require.Nil(t, apiErr)
			}
		})
	}
}

func TestParseQueryRangeParamsDashboardVarsSubstitution(t *testing.T) {
	reqCases := []struct {
		desc           string
		compositeQuery v3.CompositeQuery
		variables      map[string]interface{}
		expectErr      bool
		errMsg         string
		expectedValue  []interface{}
	}{
		{
			desc: "valid builder query with dashboard variables",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "attribute_metrics"},
						Expression:         "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "service_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorEqual,
									Value:    "{{.service_name}}",
								},
								{
									Key:      v3.AttributeKey{Key: "operation_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorIn,
									Value:    "{{.operation_name}}",
								},
							},
						},
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"operation_name": []interface{}{
					"GET /route",
					"POST /route",
				},
			},
			expectErr:     false,
			expectedValue: []interface{}{"route", []interface{}{"GET /route", "POST /route"}},
		},
		{
			desc: "valid builder query with dashboard variables {{service_name}} and {{operation_name}}",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "attribute_metrics"},
						Expression:         "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "service_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorEqual,
									Value:    "{{service_name}}",
								},
								{
									Key:      v3.AttributeKey{Key: "operation_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorIn,
									Value:    "{{operation_name}}",
								},
							},
						},
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"operation_name": []interface{}{
					"GET /route",
					"POST /route",
				},
			},
			expectErr:     false,
			expectedValue: []interface{}{"route", []interface{}{"GET /route", "POST /route"}},
		},
		{
			desc: "valid builder query with dashboard variables [[service_name]] and [[operation_name]]",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "attribute_metrics"},
						Expression:         "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "service_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorEqual,
									Value:    "[[service_name]]",
								},
								{
									Key:      v3.AttributeKey{Key: "operation_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorIn,
									Value:    "[[operation_name]]",
								},
							},
						},
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"operation_name": []interface{}{
					"GET /route",
					"POST /route",
				},
			},
			expectErr:     false,
			expectedValue: []interface{}{"route", []interface{}{"GET /route", "POST /route"}},
		},
		{
			desc: "valid builder query with dashboard variables $service_name and $operation_name",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "attribute_metrics"},
						Expression:         "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "service_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorEqual,
									Value:    "$service_name",
								},
								{
									Key:      v3.AttributeKey{Key: "operation_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorIn,
									Value:    "$operation_name",
								},
							},
						},
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"operation_name": []interface{}{
					"GET /route",
					"POST /route",
				},
			},
			expectErr:     false,
			expectedValue: []interface{}{"route", []interface{}{"GET /route", "POST /route"}},
		},
		{
			desc: "multiple values for single select operator",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "attribute_metrics"},
						Expression:         "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "operation_name", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
									Operator: v3.FilterOperatorEqual,
									Value:    "{{.operation_name}}",
								},
							},
						},
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"operation_name": []interface{}{
					"GET /route",
					"POST /route",
				},
			},
			expectErr: true,
			errMsg:    "multiple values [GET /route POST /route] are not allowed for operator `=` for key `operation_name`",
		},
	}

	for _, tc := range reqCases {
		t.Run(tc.desc, func(t *testing.T) {

			queryRangeParams := &v3.QueryRangeParamsV3{
				Start:          time.Now().Add(-time.Hour).UnixMilli(),
				End:            time.Now().UnixMilli(),
				Step:           time.Minute.Microseconds(),
				CompositeQuery: &tc.compositeQuery,
				Variables:      tc.variables,
			}

			body := &bytes.Buffer{}
			err := json.NewEncoder(body).Encode(queryRangeParams)
			require.NoError(t, err)
			req := httptest.NewRequest(http.MethodPost, "/api/v3/query_range", body)

			parsedQueryRangeParams, apiErr := ParseQueryRangeParams(req)
			if tc.expectErr {
				require.Error(t, apiErr)
				require.Contains(t, apiErr.Error(), tc.errMsg)
			} else {
				require.Nil(t, apiErr)
				require.Equal(t, parsedQueryRangeParams.CompositeQuery.BuilderQueries["A"].Filters.Items[0].Value, tc.expectedValue[0])
				require.Equal(t, parsedQueryRangeParams.CompositeQuery.BuilderQueries["A"].Filters.Items[1].Value, tc.expectedValue[1])
			}
		})
	}
}

func TestParseQueryRangeParamsPromQLVars(t *testing.T) {
	reqCases := []struct {
		desc           string
		compositeQuery v3.CompositeQuery
		variables      map[string]interface{}
		expectErr      bool
		errMsg         string
		expectedQuery  string
	}{
		{
			desc: "valid prom query with dashboard variables",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "http_calls_total{service_name=\"{{.service_name}}\", operation_name=~\"{{.operation_name}}\"}",
						Disabled: false,
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"operation_name": []interface{}{
					"GET /route",
					"POST /route",
				},
			},
			expectErr:     false,
			expectedQuery: "http_calls_total{service_name=\"route\", operation_name=~\"GET /route|POST /route\"}",
		},
		{
			desc: "valid prom query with dashboard variables",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "http_calls_total{service_name=\"{{.service_name}}\", status_code=~\"{{.status_code}}\"}",
						Disabled: false,
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"status_code": []interface{}{
					200,
					505,
				},
			},
			expectErr:     false,
			expectedQuery: "http_calls_total{service_name=\"route\", status_code=~\"200|505\"}",
		},
		{
			desc: "valid prom query with dashboard variables {{service_name}} and {{status_code}}",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "http_calls_total{service_name=\"{{service_name}}\", status_code=~\"{{status_code}}\"}",
						Disabled: false,
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"status_code": []interface{}{
					200,
					505,
				},
			},
			expectErr:     false,
			expectedQuery: "http_calls_total{service_name=\"route\", status_code=~\"200|505\"}",
		},
		{
			desc: "valid prom query with dashboard variables [[service_name]] and [[status_code]]",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "http_calls_total{service_name=\"[[service_name]]\", status_code=~\"[[status_code]]\"}",
						Disabled: false,
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"status_code": []interface{}{
					200,
					505,
				},
			},
			expectErr:     false,
			expectedQuery: "http_calls_total{service_name=\"route\", status_code=~\"200|505\"}",
		},
		{
			desc: "valid prom query with dashboard variables $service_name and $status_code",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "http_calls_total{service_name=\"$service_name\", status_code=~\"$status_code\"}",
						Disabled: false,
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"status_code": []interface{}{
					200,
					505,
				},
			},
			expectErr:     false,
			expectedQuery: "http_calls_total{service_name=\"route\", status_code=~\"200|505\"}",
		},
		{
			desc: "valid prom query with dashboard variables",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query:    "http_calls_total{service_name=\"{{.service_name}}\", quantity=~\"{{.quantity}}\"}",
						Disabled: false,
					},
				},
			},
			variables: map[string]interface{}{
				"service_name": "route",
				"quantity": []interface{}{
					4.5,
					4.6,
				},
			},
			expectErr:     false,
			expectedQuery: "http_calls_total{service_name=\"route\", quantity=~\"4.5|4.6\"}",
		},
	}

	for _, tc := range reqCases {
		t.Run(tc.desc, func(t *testing.T) {

			queryRangeParams := &v3.QueryRangeParamsV3{
				Start:          time.Now().Add(-time.Hour).UnixMilli(),
				End:            time.Now().UnixMilli(),
				Step:           time.Minute.Microseconds(),
				CompositeQuery: &tc.compositeQuery,
				Variables:      tc.variables,
			}

			body := &bytes.Buffer{}
			err := json.NewEncoder(body).Encode(queryRangeParams)
			require.NoError(t, err)
			req := httptest.NewRequest(http.MethodPost, "/api/v3/query_range", body)

			parsedQueryRangeParams, apiErr := ParseQueryRangeParams(req)
			if tc.expectErr {
				require.Error(t, apiErr)
				require.Contains(t, apiErr.Error(), tc.errMsg)
			} else {
				require.Nil(t, apiErr)
				require.Equal(t, parsedQueryRangeParams.CompositeQuery.PromQueries["A"].Query, tc.expectedQuery)
			}
		})
	}
}

func TestQueryRangeFormula(t *testing.T) {
	reqCases := []struct {
		desc           string
		compositeQuery v3.CompositeQuery
		variables      map[string]interface{}
		expectErr      bool
		errMsg         string
	}{
		{
			desc: "disjoint group by keys",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}},

						Expression: "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "operation_name"}},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "B/A",
					},
				},
			},
			expectErr: true,
			errMsg:    "Group keys must match or be a subset of the other but found left: [operation_name], right: [service_name]",
		},
		{
			desc: "identical single group by key",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "B/A",
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "identical multiple group by keys",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "B/A",
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "identical multiple group by keys with different order",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "operation_name"}, {Key: "service_name"}},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "B/A",
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "subset group by keys",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A/B",
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "empty keys on one side",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A/B",
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "empty keys on both sides",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A/B",
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "multiple group by keys with partial overlap",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "operation_name"}, {Key: "status_code"}},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A/B",
					},
				},
			},
			expectErr: true,
			errMsg:    "Group keys must match or be a subset of the other but found left: [service_name operation_name], right: [operation_name status_code]",
		},
		{
			desc: "Nested Expressions with Matching Keys - Testing expressions that involve operations (e.g., addition, division) with series whose keys match or are subsets.",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "B",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A + B",
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "Nested Expressions with Matching Keys - Testing expressions that involve operations (e.g., addition, division) with series whose keys match or are subsets.",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
						Expression:         "A",
					},
					"B": {
						QueryName:          "B",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}},
						Expression:         "B",
					},
					"C": {
						QueryName:          "C",
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}, {Key: "status_code"}},
						Expression:         "C",
					},
					"F1": {
						QueryName:  "F1",
						Expression: "C/(A + B)",
					},
				},
			},
			expectErr: false,
		},
		{
			desc: "Unknow variable in expression",
			compositeQuery: v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"F1": {
						QueryName:  "F1",
						Expression: "A + B",
					},
				},
			},
			expectErr: true,
			errMsg:    "unknown variable",
		},
	}

	for _, tc := range reqCases {
		t.Run(tc.desc, func(t *testing.T) {

			queryRangeParams := &v3.QueryRangeParamsV3{
				Start:          time.Now().Add(-time.Hour).UnixMilli(),
				End:            time.Now().UnixMilli(),
				Step:           time.Minute.Microseconds(),
				CompositeQuery: &tc.compositeQuery,
				Variables:      tc.variables,
			}

			body := &bytes.Buffer{}
			err := json.NewEncoder(body).Encode(queryRangeParams)
			require.NoError(t, err)
			req := httptest.NewRequest(http.MethodPost, "/api/v4/query_range", body)

			_, apiErr := ParseQueryRangeParams(req)
			if tc.expectErr {
				require.Error(t, apiErr)
				require.Contains(t, apiErr.Error(), tc.errMsg)
			} else {
				if apiErr != nil {
					if apiErr.Err != nil {
						t.Fatalf("unexpected error for case: %s - %v", tc.desc, apiErr.Err)
					}
				}
				require.Nil(t, apiErr)
			}
		})
	}
}

func TestParseQueryRangeParamsStepIntervalAdjustment(t *testing.T) {
	reqCases := []struct {
		desc  string
		start int64
		end   int64
		step  int64
	}{
		{
			desc:  "30 minutes and 60 seconds step",
			start: time.Now().Add(-30 * time.Minute).UnixMilli(),
			end:   time.Now().UnixMilli(),
			step:  60, // no update
		},
		{
			desc:  "1 hour and 1 second step",
			start: time.Now().Add(-time.Hour).UnixMilli(),
			end:   time.Now().UnixMilli(),
			step:  1, // gets updated
		},
		{
			desc:  "1 day and 1 hour step",
			start: time.Now().Add(-24 * time.Hour).UnixMilli(),
			end:   time.Now().UnixMilli(),
			step:  3600, // no update
		},
		{
			desc:  "1 day and 1 minute step",
			start: time.Now().Add(-24 * time.Hour).UnixMilli(),
			end:   time.Now().UnixMilli(),
			step:  60, // gets updated
		},
		{
			desc:  "1 day and 2 minutes step",
			start: time.Now().Add(-24 * time.Hour).UnixMilli(),
			end:   time.Now().UnixMilli(),
			step:  120, // gets updated
		},
		{
			desc:  "1 day and 5 minutes step",
			start: time.Now().Add(-24 * time.Hour).UnixMilli(),
			end:   time.Now().UnixMilli(),
			step:  300, // no update
		},
		{
			desc:  "1 week and 45 minutes step",
			start: time.Now().Add(-7 * 24 * time.Hour).UnixMilli(),
			end:   time.Now().UnixMilli(),
			step:  2700, // no update
		},
	}

	for _, tc := range reqCases {
		t.Run(tc.desc, func(t *testing.T) {

			queryRangeParams := &v3.QueryRangeParamsV3{
				Start: tc.start,
				End:   tc.end,
				Step:  tc.step,
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSum,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
							GroupBy:            []v3.AttributeKey{{Key: "service_name"}, {Key: "operation_name"}},
							Expression:         "A",
							StepInterval:       tc.step,
						},
					},
				},
				Variables: map[string]interface{}{},
			}

			body := &bytes.Buffer{}
			err := json.NewEncoder(body).Encode(queryRangeParams)
			require.NoError(t, err)
			req := httptest.NewRequest(http.MethodPost, "/api/v3/query_range", body)

			p, apiErr := ParseQueryRangeParams(req)
			if apiErr != nil && apiErr.Err != nil {
				t.Fatalf("unexpected error %s", apiErr.Err)
			}
			require.True(t, p.CompositeQuery.BuilderQueries["A"].StepInterval >= common.MinAllowedStepInterval(p.Start, p.End))
		})
	}
}
