package integrations

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBuiltinIntegrations(t *testing.T) {
	require := require.New(t)

	repo := BuiltInIntegrations{}

	builtins, apiErr := repo.list(context.Background())
	require.Nil(apiErr)
	require.Greater(
		len(builtins), 0,
		"some built in integrations are expected to be bundled.",
	)

	nginxIntegrationId := "builtin-nginx"
	res, apiErr := repo.get(context.Background(), []string{
		nginxIntegrationId,
	})
	require.Nil(apiErr)

	nginxIntegration, exists := res[nginxIntegrationId]
	require.True(exists)
	require.False(strings.HasPrefix(nginxIntegration.Overview, "file://"))
}
