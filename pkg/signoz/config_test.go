package signoz

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/config/configtest"
	"github.com/stretchr/testify/assert"
)

// This is a test to ensure that all fields of config implement the factory.Config interface and are valid with
// their default values.
func TestValidateConfig(t *testing.T) {
	_, err := NewConfig(context.Background(), configtest.NewResolverConfig(), DeprecatedFlags{})
	assert.NoError(t, err)
}
