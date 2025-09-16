package signoz

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/SigNoz/signoz/pkg/config/configtest"
	"github.com/stretchr/testify/assert"
)

// This is a test to ensure that all fields of config implement the factory.Config interface and are valid with
// their default values.
func TestValidateConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	_, err := NewConfig(context.Background(), logger, configtest.NewResolverConfig(), DeprecatedFlags{})
	assert.NoError(t, err)
}
