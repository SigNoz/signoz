package signoz

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewProviderConfig(t *testing.T) {
	// This is a test to ensure that provider factories can be created without panicking since
	// we are using the factory.MustNewNamedMap function to initialize the provider factories.
	// It also helps us catch these errors during testing instead of runtime.
	assert.NotPanics(t, func() {
		NewProviderConfig()
	})
}
