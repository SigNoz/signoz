package signoz

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewProviderConfig(t *testing.T) {
	// This is a compile time test to ensure that provider factories can be created
	// since we are using the factory.MustNewNamedMap function to initialize the provider factories.
	assert.NotPanics(t, func() {
		NewProviderConfig()
	})
}
