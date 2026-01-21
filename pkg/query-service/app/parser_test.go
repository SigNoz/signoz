package app

import (
	"net/http/httptest"
	"strings"
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/stretchr/testify/assert"
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
		expectedTagType    v3.TagType
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
		{
			desc:               "invalid tag type",
			queryString:        "aggregateOperator=avg&dataSource=traces&tagType=invalid",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceTraces,
			expectedTagType:    "",
			expectedLimit:      50,
		},
		{
			desc:               "valid tag type",
			queryString:        "aggregateOperator=avg&dataSource=traces&tagType=resource",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceTraces,
			expectedTagType:    v3.TagTypeResource,
			expectedLimit:      50,
		},
		{
			desc:               "valid tag type",
			queryString:        "aggregateOperator=avg&dataSource=traces&tagType=scope",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceTraces,
			expectedTagType:    v3.TagTypeInstrumentationScope,
			expectedLimit:      50,
		},
		{
			desc:               "valid tag type",
			queryString:        "aggregateOperator=avg&dataSource=traces&tagType=tag",
			expectedOperator:   v3.AggregateOperatorAvg,
			expectedDataSource: v3.DataSourceTraces,
			expectedTagType:    v3.TagTypeTag,
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
