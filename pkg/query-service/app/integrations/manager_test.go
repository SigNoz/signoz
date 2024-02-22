package integrations

import (
	"context"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/require"
)

func TestIntegrationLifecycle(t *testing.T) {
	require := require.New(t)

	mgr := NewTestIntegrationsManager(t)
	ctx := context.Background()

	installedIntegrations, apiErr := mgr.ListInstalledIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal([]InstalledIntegrationWithDetails{}, installedIntegrations)

	availableIntegrations, apiErr := mgr.ListAvailableIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.False(availableIntegrations[1].IsInstalled)

	testIntegrationConfig := map[string]interface{}{}
	installed, apiErr := mgr.InstallIntegration(
		ctx, availableIntegrations[1].Id, testIntegrationConfig,
	)
	require.Nil(apiErr)
	require.Equal(installed.Id, availableIntegrations[1].Id)

	installedIntegrations, apiErr = mgr.ListInstalledIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal(1, len(installedIntegrations))
	require.Equal(availableIntegrations[1].Id, installedIntegrations[0].Id)

	availableIntegrations, apiErr = mgr.ListAvailableIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.True(availableIntegrations[1].IsInstalled)

	apiErr = mgr.UninstallIntegration(ctx, installed.Id)
	require.Nil(apiErr)

	availableIntegrations, apiErr = mgr.ListAvailableIntegrations(ctx)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.False(availableIntegrations[1].IsInstalled)
}
