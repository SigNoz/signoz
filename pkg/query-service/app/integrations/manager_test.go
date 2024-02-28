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

	ii := true
	installedIntegrationsFilter := &IntegrationsFilter{
		IsInstalled: &ii,
	}

	installedIntegrations, apiErr := mgr.ListIntegrations(
		ctx, installedIntegrationsFilter,
	)
	require.Nil(apiErr)
	require.Equal([]IntegrationsListItem{}, installedIntegrations)

	availableIntegrations, apiErr := mgr.ListIntegrations(ctx, nil)
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

	integration, apiErr := mgr.GetIntegration(ctx, availableIntegrations[1].Id)
	require.Nil(apiErr)
	require.Equal(integration.Id, availableIntegrations[1].Id)
	require.NotNil(integration.Installation)

	installedIntegrations, apiErr = mgr.ListIntegrations(
		ctx, installedIntegrationsFilter,
	)
	require.Nil(apiErr)
	require.Equal(1, len(installedIntegrations))
	require.Equal(availableIntegrations[1].Id, installedIntegrations[0].Id)

	availableIntegrations, apiErr = mgr.ListIntegrations(ctx, nil)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.True(availableIntegrations[1].IsInstalled)

	apiErr = mgr.UninstallIntegration(ctx, installed.Id)
	require.Nil(apiErr)

	integration, apiErr = mgr.GetIntegration(ctx, availableIntegrations[1].Id)
	require.Nil(apiErr)
	require.Equal(integration.Id, availableIntegrations[1].Id)
	require.Nil(integration.Installation)

	installedIntegrations, apiErr = mgr.ListIntegrations(
		ctx, installedIntegrationsFilter,
	)
	require.Nil(apiErr)
	require.Equal(0, len(installedIntegrations))

	availableIntegrations, apiErr = mgr.ListIntegrations(ctx, nil)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.False(availableIntegrations[1].IsInstalled)
}
