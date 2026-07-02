package clickhouseReader

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/stretchr/testify/assert"
)

type GetStatusFiltersTest struct {
	query        string
	statusParams []string
	excludeMap   map[string]struct{}
	expected     string
}

func TestGetStatusFilters(t *testing.T) {
	assert := assert.New(t)
	var tests = []GetStatusFiltersTest{
		{"", make([]string, 0), map[string]struct{}{}, ""},
		{"test", []string{"error"}, map[string]struct{}{}, "test AND hasError = true"},
		{"test", []string{"ok"}, map[string]struct{}{}, "test AND hasError = false"},
		{"test", []string{"error"}, map[string]struct{}{"status": {}}, "test AND hasError = false"},
		{"test", []string{"ok"}, map[string]struct{}{"status": {}}, "test AND hasError = true"},
		{"test", []string{"error", "ok"}, map[string]struct{}{}, "test"},
	}
	for _, test := range tests {
		assert.Equal(getStatusFilters(test.query, test.statusParams, test.excludeMap), test.expected)
	}
}

func TestReadRuleStateHistoryByRuleID_InvalidOrder(t *testing.T) {
	assert := assert.New(t)
	r := &ClickHouseReader{}

	tests := []struct {
		name  string
		order string
	}{
		{"sql injection attempt", "asc' OR '1'='1"},
		{"garbage word", "ascending"},
		{"numeric", "1"},
		{"semicolon injection", "asc; DROP TABLE users"},
	}

	for _, tt := range tests {
		params := &model.QueryRuleStateHistory{Start: 0, End: 1, Order: tt.order}
		_, err := r.ReadRuleStateHistoryByRuleID(context.Background(), "some-rule-id", params)
		assert.Error(err, tt.name)
		assert.Contains(err.Error(), "invalid order parameter", tt.name)
	}
}
