package integrations

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/modules/organization"
	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/require"
)

func TestIntegrationLifecycle(t *testing.T) {
	require := require.New(t)

	mgr, store := NewTestIntegrationsManager(t)
	ctx := context.Background()

	organizationModule := organization.NewModule(store)
	user, apiErr := createTestUser(organizationModule)
	if apiErr != nil {
		t.Fatalf("could not create test user: %v", apiErr)
	}

	ii := true
	installedIntegrationsFilter := &IntegrationsFilter{
		IsInstalled: &ii,
	}

	installedIntegrations, apiErr := mgr.ListIntegrations(
		ctx, user.OrgID, installedIntegrationsFilter,
	)
	require.Nil(apiErr)
	require.Equal([]IntegrationsListItem{}, installedIntegrations)

	availableIntegrations, apiErr := mgr.ListIntegrations(ctx, user.OrgID, nil)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.False(availableIntegrations[1].IsInstalled)

	testIntegrationConfig := map[string]interface{}{}
	installed, apiErr := mgr.InstallIntegration(
		ctx, user.OrgID, availableIntegrations[1].Id, testIntegrationConfig,
	)
	require.Nil(apiErr)
	require.Equal(installed.Id, availableIntegrations[1].Id)

	integration, apiErr := mgr.GetIntegration(ctx, user.OrgID, availableIntegrations[1].Id)
	require.Nil(apiErr)
	require.Equal(integration.Id, availableIntegrations[1].Id)
	require.NotNil(integration.Installation)

	installedIntegrations, apiErr = mgr.ListIntegrations(
		ctx, user.OrgID, installedIntegrationsFilter,
	)
	require.Nil(apiErr)
	require.Equal(1, len(installedIntegrations))
	require.Equal(availableIntegrations[1].Id, installedIntegrations[0].Id)

	availableIntegrations, apiErr = mgr.ListIntegrations(ctx, user.OrgID, nil)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.True(availableIntegrations[1].IsInstalled)

	apiErr = mgr.UninstallIntegration(ctx, user.OrgID, installed.Id)
	require.Nil(apiErr)

	integration, apiErr = mgr.GetIntegration(ctx, user.OrgID, availableIntegrations[1].Id)
	require.Nil(apiErr)
	require.Equal(integration.Id, availableIntegrations[1].Id)
	require.Nil(integration.Installation)

	installedIntegrations, apiErr = mgr.ListIntegrations(
		ctx, user.OrgID, installedIntegrationsFilter,
	)
	require.Nil(apiErr)
	require.Equal(0, len(installedIntegrations))

	availableIntegrations, apiErr = mgr.ListIntegrations(ctx, user.OrgID, nil)
	require.Nil(apiErr)
	require.Equal(2, len(availableIntegrations))
	require.False(availableIntegrations[0].IsInstalled)
	require.False(availableIntegrations[1].IsInstalled)
}
