package app

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/smartystreets/assertions/should"
	. "github.com/smartystreets/goconvey/convey"
	"github.com/stretchr/testify/assert"
	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestParseFilterSingleFilter(t *testing.T) {
	Convey("TestParseFilterSingleFilter", t, func() {
		postBody := []byte(`{
			"op": "AND",
			"items": [
				{"key": "namespace", "value": "a", "op": "EQ"}
			]
		}`)
		req, _ := http.NewRequest("POST", "", bytes.NewReader(postBody))
		res, _ := parseFilterSet(req)
		query, _ := metrics.BuildMetricsTimeSeriesFilterQuery(res, []string{}, "table", model.NOOP)
		So(query, ShouldContainSubstring, "signoz_metrics.distributed_time_series_v2 WHERE metric_name = 'table' AND JSONExtractString(labels, 'namespace') = 'a'")
	})
}

func TestParseFilterMultipleFilter(t *testing.T) {
	Convey("TestParseFilterMultipleFilter", t, func() {
		postBody := []byte(`{
			"op": "AND",
			"items": [
				{"key": "namespace", "value": "a", "op": "EQ"},
				{"key": "host", "value": ["host-1", "host-2"], "op": "IN"}
			]
		}`)
		req, _ := http.NewRequest("POST", "", bytes.NewReader(postBody))
		res, _ := parseFilterSet(req)
		query, _ := metrics.BuildMetricsTimeSeriesFilterQuery(res, []string{}, "table", model.NOOP)
		So(query, should.ContainSubstring, "JSONExtractString(labels, 'host') IN ['host-1','host-2']")
		So(query, should.ContainSubstring, "JSONExtractString(labels, 'namespace') = 'a'")
	})
}

func TestParseFilterNotSupportedOp(t *testing.T) {
	Convey("TestParseFilterNotSupportedOp", t, func() {
		postBody := []byte(`{
			"op": "AND",
			"items": [
				{"key": "namespace", "value": "a", "op": "PO"}
			]
		}`)
		req, _ := http.NewRequest("POST", "", bytes.NewReader(postBody))
		res, _ := parseFilterSet(req)
		_, err := metrics.BuildMetricsTimeSeriesFilterQuery(res, []string{}, "table", model.NOOP)
		So(err, should.BeError, "unsupported operation")
	})
}

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
