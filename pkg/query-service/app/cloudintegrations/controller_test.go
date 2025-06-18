package cloudintegrations

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
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sharder/noopsharder"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestRegenerateConnectionUrlWithUpdatedConfig(t *testing.T) {
	require := require.New(t)
	sqlStore := utils.NewQueryServiceDBForTests(t)
	controller, err := NewController(sqlStore)
	require.NoError(err)

	providerSettings := instrumentationtest.New().ToProviderSettings()
	sharder, err := noopsharder.New(context.TODO(), providerSettings, sharder.Config{})
	require.NoError(err)
	orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlStore), sharder)
	alertmanager, err := signozalertmanager.New(context.TODO(), providerSettings, alertmanager.Config{Provider: "signoz", Signoz: alertmanager.Signoz{PollInterval: 10 * time.Second, Config: alertmanagerserver.NewConfig()}}, sqlStore, orgGetter)
	require.NoError(err)
	jwt := authtypes.NewJWT("", 1*time.Hour, 1*time.Hour)
	emailing := emailingtest.New()
	analytics := analyticstest.New()
	modules := signoz.NewModules(sqlStore, jwt, emailing, providerSettings, orgGetter, alertmanager, analytics)
	user, apiErr := createTestUser(modules.OrgSetter, modules.User)
	require.Nil(apiErr)

	// should be able to generate connection url for
	// same account id again with updated config
	testAccountConfig1 := types.AccountConfig{EnabledRegions: []string{"us-east-1", "us-west-1"}}
	resp1, apiErr := controller.GenerateConnectionUrl(
		context.TODO(), user.OrgID, "aws", GenerateConnectionUrlRequest{
			AccountConfig: testAccountConfig1,
			AgentConfig:   SigNozAgentConfig{Region: "us-east-2"},
		},
	)
	require.Nil(apiErr)
	require.NotEmpty(resp1.ConnectionUrl)
	require.NotEmpty(resp1.AccountId)

	testAccountId := resp1.AccountId
	account, apiErr := controller.accountsRepo.get(
		context.TODO(), user.OrgID, "aws", testAccountId,
	)
	require.Nil(apiErr)
	require.Equal(testAccountConfig1, *account.Config)

	testAccountConfig2 := types.AccountConfig{EnabledRegions: []string{"us-east-2", "us-west-2"}}
	resp2, apiErr := controller.GenerateConnectionUrl(
		context.TODO(), user.OrgID, "aws", GenerateConnectionUrlRequest{
			AccountId:     &testAccountId,
			AccountConfig: testAccountConfig2,
			AgentConfig:   SigNozAgentConfig{Region: "us-east-2"},
		},
	)
	require.Nil(apiErr)
	require.Equal(testAccountId, resp2.AccountId)

	account, apiErr = controller.accountsRepo.get(
		context.TODO(), user.OrgID, "aws", testAccountId,
	)
	require.Nil(apiErr)
	require.Equal(testAccountConfig2, *account.Config)
}

func TestAgentCheckIns(t *testing.T) {
	require := require.New(t)
	sqlStore := utils.NewQueryServiceDBForTests(t)
	controller, err := NewController(sqlStore)
	require.NoError(err)

	providerSettings := instrumentationtest.New().ToProviderSettings()
	sharder, err := noopsharder.New(context.TODO(), providerSettings, sharder.Config{})
	require.NoError(err)
	orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlStore), sharder)
	alertmanager, err := signozalertmanager.New(context.TODO(), providerSettings, alertmanager.Config{Provider: "signoz", Signoz: alertmanager.Signoz{PollInterval: 10 * time.Second, Config: alertmanagerserver.NewConfig()}}, sqlStore, orgGetter)
	require.NoError(err)
	jwt := authtypes.NewJWT("", 1*time.Hour, 1*time.Hour)
	emailing := emailingtest.New()
	analytics := analyticstest.New()
	modules := signoz.NewModules(sqlStore, jwt, emailing, providerSettings, orgGetter, alertmanager, analytics)
	user, apiErr := createTestUser(modules.OrgSetter, modules.User)
	require.Nil(apiErr)

	// An agent should be able to check in from a cloud account even
	// if no connection url was requested (no account with agent's account id exists)
	testAccountId1 := uuid.NewString()
	testCloudAccountId1 := "546311234"
	resp1, err := controller.CheckInAsAgent(
		context.TODO(), user.OrgID, "aws", AgentCheckInRequest{
			ID:        testAccountId1,
			AccountID: testCloudAccountId1,
		},
	)
	require.Nil(err)
	require.Equal(testAccountId1, resp1.AccountId)
	require.Equal(testCloudAccountId1, resp1.CloudAccountId)

	// The agent should not be able to check in with a different
	// cloud account id for the same account.
	testCloudAccountId2 := "99999999"
	_, err = controller.CheckInAsAgent(
		context.TODO(), user.OrgID, "aws", AgentCheckInRequest{
			ID:        testAccountId1,
			AccountID: testCloudAccountId2,
		},
	)
	require.NotNil(err)

	// The agent should not be able to check-in with a particular cloud account id
	// if another connected AccountRecord exists for same cloud account
	// i.e. there can't be 2 connected account records for the same cloud account id
	// at any point in time.
	existingConnected, apiErr := controller.accountsRepo.getConnectedCloudAccount(
		context.TODO(), user.OrgID, "aws", testCloudAccountId1,
	)
	require.Nil(apiErr)
	require.NotNil(existingConnected)
	require.Equal(testCloudAccountId1, *existingConnected.AccountID)
	require.Nil(existingConnected.RemovedAt)

	testAccountId2 := uuid.NewString()
	_, err = controller.CheckInAsAgent(
		context.TODO(), user.OrgID, "aws", AgentCheckInRequest{
			ID:        testAccountId2,
			AccountID: testCloudAccountId1,
		},
	)
	require.NotNil(err)

	// After disconnecting existing account record, the agent should be able to
	// connected for a particular cloud account id
	_, _ = controller.DisconnectAccount(
		context.TODO(), user.OrgID, "aws", testAccountId1,
	)

	existingConnected, apiErr = controller.accountsRepo.getConnectedCloudAccount(
		context.TODO(), user.OrgID, "aws", testCloudAccountId1,
	)
	require.Nil(existingConnected)
	require.NotNil(apiErr)
	require.Equal(model.ErrorNotFound, apiErr.Type())

	_, err = controller.CheckInAsAgent(
		context.TODO(), user.OrgID, "aws", AgentCheckInRequest{
			ID:        testAccountId2,
			AccountID: testCloudAccountId1,
		},
	)
	require.Nil(err)

	// should be able to keep checking in
	_, err = controller.CheckInAsAgent(
		context.TODO(), user.OrgID, "aws", AgentCheckInRequest{
			ID:        testAccountId2,
			AccountID: testCloudAccountId1,
		},
	)
	require.Nil(err)
}

func TestCantDisconnectNonExistentAccount(t *testing.T) {
	require := require.New(t)
	sqlStore := utils.NewQueryServiceDBForTests(t)
	controller, err := NewController(sqlStore)
	require.NoError(err)

	providerSettings := instrumentationtest.New().ToProviderSettings()
	sharder, err := noopsharder.New(context.TODO(), providerSettings, sharder.Config{})
	require.NoError(err)
	orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlStore), sharder)
	alertmanager, err := signozalertmanager.New(context.TODO(), providerSettings, alertmanager.Config{Provider: "signoz", Signoz: alertmanager.Signoz{PollInterval: 10 * time.Second, Config: alertmanagerserver.NewConfig()}}, sqlStore, orgGetter)
	require.NoError(err)
	jwt := authtypes.NewJWT("", 1*time.Hour, 1*time.Hour)
	emailing := emailingtest.New()
	analytics := analyticstest.New()
	modules := signoz.NewModules(sqlStore, jwt, emailing, providerSettings, orgGetter, alertmanager, analytics)
	user, apiErr := createTestUser(modules.OrgSetter, modules.User)
	require.Nil(apiErr)

	// Attempting to disconnect a non-existent account should return error
	account, apiErr := controller.DisconnectAccount(
		context.TODO(), user.OrgID, "aws", uuid.NewString(),
	)
	require.NotNil(apiErr)
	require.Equal(model.ErrorNotFound, apiErr.Type())
	require.Nil(account)
}

func TestConfigureService(t *testing.T) {
	require := require.New(t)
	sqlStore := utils.NewQueryServiceDBForTests(t)
	controller, err := NewController(sqlStore)
	require.NoError(err)

	providerSettings := instrumentationtest.New().ToProviderSettings()
	sharder, err := noopsharder.New(context.TODO(), providerSettings, sharder.Config{})
	require.NoError(err)
	orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlStore), sharder)
	alertmanager, err := signozalertmanager.New(context.TODO(), providerSettings, alertmanager.Config{Provider: "signoz", Signoz: alertmanager.Signoz{PollInterval: 10 * time.Second, Config: alertmanagerserver.NewConfig()}}, sqlStore, orgGetter)
	require.NoError(err)
	jwt := authtypes.NewJWT("", 1*time.Hour, 1*time.Hour)
	emailing := emailingtest.New()
	analytics := analyticstest.New()
	modules := signoz.NewModules(sqlStore, jwt, emailing, providerSettings, orgGetter, alertmanager, analytics)
	user, apiErr := createTestUser(modules.OrgSetter, modules.User)
	require.Nil(apiErr)

	// create a connected account
	testCloudAccountId := "546311234"
	testConnectedAccount := makeTestConnectedAccount(t, user.OrgID, controller, testCloudAccountId)
	require.Nil(testConnectedAccount.RemovedAt)
	require.NotEmpty(testConnectedAccount.AccountID)
	require.Equal(testCloudAccountId, *testConnectedAccount.AccountID)

	// should start out without any service config
	svcListResp, apiErr := controller.ListServices(
		context.TODO(), user.OrgID, "aws", &testCloudAccountId,
	)
	require.Nil(apiErr)

	testSvcId := svcListResp.Services[0].Id
	require.Nil(svcListResp.Services[0].Config)

	svcDetails, err := controller.GetServiceDetails(
		context.TODO(), user.OrgID, "aws", testSvcId, &testCloudAccountId,
	)
	require.Nil(err)
	require.Equal(testSvcId, svcDetails.Id)
	require.Nil(svcDetails.Config)

	// should be able to configure a service for a connected account
	testSvcConfig := types.CloudServiceConfig{
		Metrics: &types.CloudServiceMetricsConfig{
			Enabled: true,
		},
	}
	updateSvcConfigResp, err := controller.UpdateServiceConfig(
		context.TODO(), user.OrgID, "aws", testSvcId, &UpdateServiceConfigRequest{
			CloudAccountId: testCloudAccountId,
			Config:         testSvcConfig,
		},
	)
	require.Nil(err)
	require.Equal(testSvcId, updateSvcConfigResp.Id)
	require.Equal(testSvcConfig, updateSvcConfigResp.Config)

	svcDetails, err = controller.GetServiceDetails(
		context.TODO(), user.OrgID, "aws", testSvcId, &testCloudAccountId,
	)
	require.Nil(err)
	require.Equal(testSvcId, svcDetails.Id)
	require.Equal(testSvcConfig, *svcDetails.Config)

	svcListResp, apiErr = controller.ListServices(
		context.TODO(), user.OrgID, "aws", &testCloudAccountId,
	)
	require.Nil(apiErr)
	for _, svc := range svcListResp.Services {
		if svc.Id == testSvcId {
			require.Equal(testSvcConfig, *svc.Config)
		}
	}

	// should not be able to configure service after cloud account has been disconnected
	_, apiErr = controller.DisconnectAccount(
		context.TODO(), user.OrgID, "aws", testConnectedAccount.ID.StringValue(),
	)
	require.Nil(apiErr)

	_, err = controller.UpdateServiceConfig(
		context.TODO(), user.OrgID, "aws", testSvcId,
		&UpdateServiceConfigRequest{
			CloudAccountId: testCloudAccountId,
			Config:         testSvcConfig,
		},
	)
	require.NotNil(err)

	// should not be able to configure a service for a cloud account id that is not connected yet
	_, err = controller.UpdateServiceConfig(
		context.TODO(), user.OrgID, "aws", testSvcId,
		&UpdateServiceConfigRequest{
			CloudAccountId: "9999999999",
			Config:         testSvcConfig,
		},
	)
	require.NotNil(err)

	// should not be able to set config for an unsupported service
	_, err = controller.UpdateServiceConfig(
		context.TODO(), user.OrgID, "aws", "bad-service", &UpdateServiceConfigRequest{
			CloudAccountId: testCloudAccountId,
			Config:         testSvcConfig,
		},
	)
	require.NotNil(err)

}

func makeTestConnectedAccount(t *testing.T, orgId string, controller *Controller, cloudAccountId string) *types.CloudIntegration {
	require := require.New(t)

	// a check in from SigNoz agent creates or updates a connected account.
	testAccountId := uuid.NewString()
	resp, apiErr := controller.CheckInAsAgent(
		context.TODO(), orgId, "aws", AgentCheckInRequest{
			ID:        testAccountId,
			AccountID: cloudAccountId,
		},
	)
	require.Nil(apiErr)
	require.Equal(testAccountId, resp.AccountId)
	require.Equal(cloudAccountId, resp.CloudAccountId)

	acc, err := controller.accountsRepo.get(context.TODO(), orgId, "aws", resp.AccountId)
	require.Nil(err)
	return acc
}

func createTestUser(organizationModule organization.Setter, userModule user.Module) (*types.User, *model.ApiError) {
	// Create a test user for auth
	ctx := context.Background()
	organization := types.NewOrganization("test")
	err := organizationModule.Create(ctx, organization)
	if err != nil {
		return nil, model.InternalError(err)
	}

	random, err := utils.RandomHex(3)
	if err != nil {
		return nil, model.InternalError(err)
	}

	user, err := types.NewUser("test", random+"test@test.com", types.RoleAdmin.String(), organization.ID.StringValue())
	if err != nil {
		return nil, model.InternalError(err)
	}
	err = userModule.CreateUser(ctx, user)
	if err != nil {
		return nil, model.InternalError(err)
	}
	return user, nil
}
