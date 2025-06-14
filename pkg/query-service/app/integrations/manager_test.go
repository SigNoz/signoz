package integrations

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager"
	"github.com/SigNoz/signoz/pkg/analytics/analyticstest"
	"github.com/SigNoz/signoz/pkg/emailing/emailingtest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sharder/noopsharder"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/require"
)

func TestIntegrationLifecycle(t *testing.T) {
	require := require.New(t)

	mgr, store := NewTestIntegrationsManager(t)
	ctx := context.Background()

	providerSettings := instrumentationtest.New().ToProviderSettings()
	sharder, _ := noopsharder.New(context.TODO(), providerSettings, sharder.Config{})
	orgGetter := implorganization.NewGetter(implorganization.NewStore(store), sharder)
	alertmanager, _ := signozalertmanager.New(context.TODO(), providerSettings, alertmanager.Config{Provider: "signoz", Signoz: alertmanager.Signoz{PollInterval: 10 * time.Second, Config: alertmanagerserver.NewConfig()}}, store, orgGetter)
	jwt := authtypes.NewJWT("", 1*time.Hour, 1*time.Hour)
	emailing := emailingtest.New()
	analytics := analyticstest.New()
	modules := signoz.NewModules(store, jwt, emailing, providerSettings, orgGetter, alertmanager, analytics)
	user, apiErr := createTestUser(modules.OrgSetter, modules.User)
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
