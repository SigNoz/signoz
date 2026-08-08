package sqlmigration

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHTTPMethodQuickFilterMigrationUsesCurrentName(t *testing.T) {
	oldName := httpRequestMethodOld()
	input := `[{"key":"` + oldName + `","dataType":"string","type":"tag"}]`

	rewritten, changed, err := rewriteQuickFilterSemconv(input, oldName, httpRequestMethodCurrent)
	require.NoError(t, err, "valid quick-filter JSON should be rewritten")
	assert.True(t, changed, "historical HTTP method key should be reported as changed")

	var filters []map[string]any
	require.NoError(t, json.Unmarshal([]byte(rewritten), &filters), "rewritten quick filter should remain valid JSON")
	require.Len(t, filters, 1, "rewritten quick filter should retain its entry")
	assert.Equal(t, httpRequestMethodCurrent, filters[0]["key"], "migration should store the current HTTP method name")
}

func TestHTTPMethodQuickFilterRollbackUsesHistoricalName(t *testing.T) {
	oldName := httpRequestMethodOld()
	input := `[{"key":"` + httpRequestMethodCurrent + `","dataType":"string","type":"tag"}]`

	restored, changed, err := rewriteQuickFilterSemconv(input, httpRequestMethodCurrent, oldName)
	require.NoError(t, err, "valid quick-filter JSON should be restored")
	assert.True(t, changed, "current HTTP method key should be reported as changed during rollback")

	var filters []map[string]any
	require.NoError(t, json.Unmarshal([]byte(restored), &filters), "restored quick filter should remain valid JSON")
	require.Len(t, filters, 1, "restored quick filter should retain its entry")
	assert.Equal(t, oldName, filters[0]["key"], "rollback should restore the historical HTTP method name")
}

func TestMigrateHTTPMethodQuickFilterFactoryName(t *testing.T) {
	assert.Equal(t, "migrate_http_method_filter", NewMigrateHTTPMethodQuickFilterFactory().Name().String(), "migration factory should expose its registered name")
}
