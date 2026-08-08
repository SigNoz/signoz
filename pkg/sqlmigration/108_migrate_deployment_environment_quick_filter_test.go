package sqlmigration

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRewriteQuickFilterSemconv(t *testing.T) {
	oldName := deploymentEnvironmentOld()
	input := `[{"key":"service.name","dataType":"string","type":"resource"},{"key":"` + oldName + `","dataType":"string","type":"resource","custom":true}]`

	rewritten, changed, err := rewriteQuickFilterSemconv(input, oldName, deploymentEnvironmentCurrent)
	require.NoError(t, err)
	assert.True(t, changed)

	var filters []map[string]any
	require.NoError(t, json.Unmarshal([]byte(rewritten), &filters))
	assert.Equal(t, "service.name", filters[0]["key"])
	assert.Equal(t, deploymentEnvironmentCurrent, filters[1]["key"])
	assert.Equal(t, true, filters[1]["custom"], "unknown filter properties must be preserved")

	restored, changed, err := rewriteQuickFilterSemconv(rewritten, deploymentEnvironmentCurrent, oldName)
	require.NoError(t, err)
	assert.True(t, changed)
	require.NoError(t, json.Unmarshal([]byte(restored), &filters))
	assert.Equal(t, oldName, filters[1]["key"])
}

func TestRewriteQuickFilterSemconvNoop(t *testing.T) {
	input := `[{"key":"service.name","dataType":"string","type":"resource"}]`
	rewritten, changed, err := rewriteQuickFilterSemconv(input, deploymentEnvironmentOld(), deploymentEnvironmentCurrent)
	require.NoError(t, err)
	assert.False(t, changed)
	assert.Equal(t, input, rewritten)
}
