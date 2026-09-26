package opamp

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A pipeline's processor list comes from the agent's own config, so an entry is
// not guaranteed to be a processor name. Indenting a processor's settings under
// the pipeline list, rather than under the top level processors block, yields a
// map here. That used to panic on the type assertion.
func TestBuildPipelineIgnoresNonStringEntries(t *testing.T) {
	current := []interface{}{
		"signoztailsampler",
		map[string]interface{}{"batch": map[string]interface{}{"timeout": "1s"}},
		"batch",
	}

	merged, err := buildPipeline(Traces, current)
	require.NoError(t, err)
	assert.Contains(t, merged, "batch")
	assert.Contains(t, merged, "signoztailsampler")
}

func TestCheckDuplicatesIgnoresNonStringEntries(t *testing.T) {
	nonName := map[string]interface{}{"batch": map[string]interface{}{"timeout": "1s"}}

	// Two entries that are not names are not duplicate processor names.
	assert.False(t, checkDuplicates([]interface{}{nonName, nonName}))

	// Real duplicates are still reported, and a non-string alongside them does
	// not hide them.
	assert.True(t, checkDuplicates([]interface{}{"batch", nonName, "batch"}))

	assert.False(t, checkDuplicates([]interface{}{"batch", "signoztailsampler"}))
}
