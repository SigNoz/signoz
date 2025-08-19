package ctxtypes

import (
	"maps"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCommentFromHTTPRequest(t *testing.T) {
	testCases := []struct {
		name     string
		req      *http.Request
		expected map[string]string
	}{
		{
			name:     "EmptyReferer",
			req:      &http.Request{Header: http.Header{"Referer": {""}}},
			expected: map[string]string{},
		},
		{
			name:     "ControlCharacterInReferer",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/logs/logs-explorer\x00"}}},
			expected: map[string]string{},
		},
		{
			name:     "LogsExplorer",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/logs/logs-explorer"}}},
			expected: map[string]string{"http_path": "/logs/logs-explorer", "module_name": "logs-explorer"},
		},
		{
			name:     "TracesExplorer",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/traces-explorer"}}},
			expected: map[string]string{"http_path": "/traces-explorer", "module_name": "traces-explorer"},
		},
		{
			name:     "MetricsExplorer",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/metrics-explorer/explorer"}}},
			expected: map[string]string{"http_path": "/metrics-explorer/explorer", "module_name": "metrics-explorer"},
		},
		{
			name:     "DashboardWithID",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/dashboard/123/new"}}},
			expected: map[string]string{"http_path": "/dashboard/123/new", "module_name": "dashboard", "dashboard_id": "123"},
		},
		{
			name:     "Rule",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/alerts/new"}}},
			expected: map[string]string{"http_path": "/alerts/new", "module_name": "rule"},
		},
		{
			name:     "RuleWithID",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/alerts/edit?ruleId=123"}}},
			expected: map[string]string{"http_path": "/alerts/edit", "module_name": "rule", "rule_id": "123"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actual := CommentFromHTTPRequest(tc.req)

			assert.True(t, maps.Equal(actual, tc.expected))
		})
	}
}
