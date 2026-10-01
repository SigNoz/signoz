package semconvsql

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResolveTraceStringAttributesExpandsDirectReads(t *testing.T) {
	query := `SELECT attributes_string['messaging.destination.name'] AS destination
FROM spans`

	resolved := ResolveTraceStringAttributes(query, "messaging.destination.name")

	assert.Contains(t, resolved, "COALESCE(NULLIF(attributes_string['messaging.destination.name'], ''), NULLIF(attributes_string['messaging.destination'], ''))", "direct attribute read should coalesce every family member")
}

func TestResolveTraceStringAttributesExpandsExistenceChecks(t *testing.T) {
	query := `SELECT count() FROM spans
WHERE has(attributes_string, 'messaging.destination.name')`

	resolved := ResolveTraceStringAttributes(query, "messaging.destination.name")

	assert.Contains(t, resolved, "(has(attributes_string, 'messaging.destination.name') OR has(attributes_string, 'messaging.destination'))", "existence check should cover every family member")
}

func TestResolveTraceStringAttributesKeepsCurrentNameFirst(t *testing.T) {
	query := `SELECT attributes_string['messaging.destination.name'] FROM spans`

	resolved := ResolveTraceStringAttributes(query, "messaging.destination.name")

	assert.Less(t, strings.Index(resolved, "messaging.destination.name"), strings.Index(resolved, "messaging.destination'"), "current name should remain the first fallback")
}

func TestResolveTraceStringAttributesLeavesUnknownNameAlone(t *testing.T) {
	query := "SELECT attributes_string['custom.attribute']"

	resolved := ResolveTraceStringAttributes(query, "custom.attribute")

	assert.Equal(t, query, resolved, "unknown attributes should not be rewritten")
}
