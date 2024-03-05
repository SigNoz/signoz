package integrations

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBuiltinIntegrations(t *testing.T) {
	require := require.New(t)

	repo := BuiltInIntegrations{}

	builtins, apiErr := repo.list(context.Background())
	require.Nil(apiErr)

	require.Greater(len(builtins), 0)
}
