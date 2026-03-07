package preferencetypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewAvailablePreference(t *testing.T) {
	assert.NotPanics(t, func() {
		available := NewAvailablePreference()
		assert.NotNil(t, available)
	})
}
