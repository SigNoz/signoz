package clickhouseReader

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
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


func TestMaxRetentionTTLForKeyTables(t *testing.T) {
	testCases := []struct {
		name              string
		defaultTTLDays    int
		ttlConditions     []retentiontypes.CustomRetentionRule
		expectedTTLDays   int
	}{
		{
			name:            "zero default falls back to logs retention",
			defaultTTLDays:  0,
			expectedTTLDays: retentiontypes.DefaultLogsRetentionDays,
		},
		{
			name:            "negative default falls back to logs retention",
			defaultTTLDays:  -1,
			expectedTTLDays: retentiontypes.DefaultLogsRetentionDays,
		},
		{
			name:            "positive default is preserved",
			defaultTTLDays:  7,
			expectedTTLDays: 7,
		},
		{
			name:           "longer rule retention wins",
			defaultTTLDays: 7,
			ttlConditions: []retentiontypes.CustomRetentionRule{
				{TTLDays: 30},
			},
			expectedTTLDays: 30,
		},
		{
			name:           "non-positive rules cannot remove the fallback",
			defaultTTLDays: 0,
			ttlConditions: []retentiontypes.CustomRetentionRule{
				{TTLDays: 0},
				{TTLDays: -5},
			},
			expectedTTLDays: retentiontypes.DefaultLogsRetentionDays,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expectedTTLDays, maxRetentionTTLForKeyTables(tc.defaultTTLDays, tc.ttlConditions))
		})
	}
}
