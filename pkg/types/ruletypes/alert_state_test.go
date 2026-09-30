package ruletypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// Both rankings must stay exhaustive: a new AlertState needs an entry in each.
func TestAlertStateRankingsAreExhaustive(t *testing.T) {
	states := AlertState{}.Enum()

	assert.Len(t, alertStateSeverity, len(states))
	assert.Len(t, alertStateDisplayRank, len(states))

	for _, s := range states {
		state := s.(AlertState)
		assert.Contains(t, alertStateSeverity, state, "missing severity for state %q", state)
		assert.Contains(t, alertStateDisplayRank, state, "missing display rank for state %q", state)
	}
}
