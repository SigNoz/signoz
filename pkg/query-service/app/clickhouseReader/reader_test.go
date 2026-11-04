package clickhouseReader

import (
	"context"
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

// SetTTLV2 must reject a non-positive default TTL before issuing any
// ClickHouse ALTER, otherwise _retention_days is set to DEFAULT 0 and new
// rows expire immediately. The zero-value reader has no database handles,
// so any attempted DB access would panic; NotPanics proves no ALTER ran.
func TestSetTTLV2RejectsNonPositiveDefaultTTL(t *testing.T) {
	reader := &ClickHouseReader{}

	for _, days := range []int{0, -7} {
		params := &retentiontypes.CustomRetentionTTLParams{
			Type:           retentiontypes.LogsTTL,
			DefaultTTLDays: days,
		}

		var err error
		assert.NotPanics(t, func() {
			_, err = reader.SetTTLV2(context.Background(), "test-org", params)
		}, "SetTTLV2 must reject invalid TTL before touching the database")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "defaultTTLDays")
	}
}
