package cloudintegrations

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func TestRegenerateConnectionUrlWithUpdatedConfig(t *testing.T) {
	require := require.New(t)
	testDB, _ := utils.NewTestSqliteDB(t)
	controller, err := NewController(testDB)
	require.NoError(err)

	// should be able to generate connection url for
	// same account id again with updated config
	testAccountConfig1 := AccountConfig{EnabledRegions: []string{"us-east-1", "us-west-1"}}
	resp1, apiErr := controller.GenerateConnectionUrl(
		context.TODO(), "aws", GenerateConnectionUrlRequest{
			AccountConfig: testAccountConfig1,
			AgentConfig:   SigNozAgentConfig{Region: "us-east-2"},
		},
	)
	require.Nil(apiErr)
	require.NotEmpty(resp1.ConnectionUrl)
	require.NotEmpty(resp1.AccountId)

	testAccountId := resp1.AccountId
	account, apiErr := controller.accountsRepo.get(
		context.TODO(), "aws", testAccountId,
	)
	require.Nil(apiErr)
	require.Equal(testAccountConfig1, *account.Config)

	testAccountConfig2 := AccountConfig{EnabledRegions: []string{"us-east-2", "us-west-2"}}
	resp2, apiErr := controller.GenerateConnectionUrl(
		context.TODO(), "aws", GenerateConnectionUrlRequest{
			AccountId:     &testAccountId,
			AccountConfig: testAccountConfig2,
			AgentConfig:   SigNozAgentConfig{Region: "us-east-2"},
		},
	)
	require.Nil(apiErr)
	require.Equal(testAccountId, resp2.AccountId)

	account, apiErr = controller.accountsRepo.get(
		context.TODO(), "aws", testAccountId,
	)
	require.Nil(apiErr)
	require.Equal(testAccountConfig2, *account.Config)
}

func TestAgentCheckIns(t *testing.T) {
	require := require.New(t)
	testDB, _ := utils.NewTestSqliteDB(t)
	controller, err := NewController(testDB)
	require.NoError(err)

	// An agent should be able to check in from a cloud account even
	// if no connection url was requested (no account with agent's account id exists)
	testAccountId1 := uuid.NewString()
	testCloudAccountId1 := "546311234"
	resp1, apiErr := controller.CheckInAsAgent(
		context.TODO(), "aws", AgentCheckInRequest{
			AccountId:      testAccountId1,
			CloudAccountId: testCloudAccountId1,
		},
	)
	require.Nil(apiErr)
	require.Equal(testAccountId1, resp1.Account.Id)
	require.Equal(testCloudAccountId1, *resp1.Account.CloudAccountId)

	// The agent should not be able to check in with a different
	// cloud account id for the same account.
	testCloudAccountId2 := "99999999"
	_, apiErr = controller.CheckInAsAgent(
		context.TODO(), "aws", AgentCheckInRequest{
			AccountId:      testAccountId1,
			CloudAccountId: testCloudAccountId2,
		},
	)
	require.NotNil(apiErr)

	// The agent should not be able to check-in with a particular cloud account id
	// if another connected AccountRecord exists for same cloud account
	// i.e. there can't be 2 connected account records for the same cloud account id
	// at any point in time.
	existingConnected, apiErr := controller.accountsRepo.getConnectedCloudAccount(
		context.TODO(), "aws", testCloudAccountId1,
	)
	require.Nil(apiErr)
	require.NotNil(existingConnected)
	require.Equal(testCloudAccountId1, *existingConnected.CloudAccountId)
	require.Nil(existingConnected.RemovedAt)

	testAccountId2 := uuid.NewString()
	_, apiErr = controller.CheckInAsAgent(
		context.TODO(), "aws", AgentCheckInRequest{
			AccountId:      testAccountId2,
			CloudAccountId: testCloudAccountId1,
		},
	)
	require.NotNil(apiErr)

	// After disconnecting existing account record, the agent should be able to
	// connected for a particular cloud account id
	_, apiErr = controller.DisconnectAccount(
		context.TODO(), "aws", testAccountId1,
	)

	existingConnected, apiErr = controller.accountsRepo.getConnectedCloudAccount(
		context.TODO(), "aws", testCloudAccountId1,
	)
	require.Nil(existingConnected)
	require.NotNil(apiErr)
	require.Equal(model.ErrorNotFound, apiErr.Type())

	_, apiErr = controller.CheckInAsAgent(
		context.TODO(), "aws", AgentCheckInRequest{
			AccountId:      testAccountId2,
			CloudAccountId: testCloudAccountId1,
		},
	)
	require.Nil(apiErr)

	// should be able to keep checking in
	_, apiErr = controller.CheckInAsAgent(
		context.TODO(), "aws", AgentCheckInRequest{
			AccountId:      testAccountId2,
			CloudAccountId: testCloudAccountId1,
		},
	)
	require.Nil(apiErr)
}

func TestCantDisconnectNonExistentAccount(t *testing.T) {
	require := require.New(t)
	testDB, _ := utils.NewTestSqliteDB(t)
	controller, err := NewController(testDB)
	require.NoError(err)

	// Attempting to disconnect a non-existent account should return error
	account, apiErr := controller.DisconnectAccount(
		context.TODO(), "aws", uuid.NewString(),
	)
	require.NotNil(apiErr)
	require.Equal(model.ErrorNotFound, apiErr.Type())
	require.Nil(account)
}

func TestConfigureService(t *testing.T) {
	require := require.New(t)
	testDB, _ := utils.NewTestSqliteDB(t)
	controller, err := NewController(testDB)
	require.NoError(err)

	services, apiErr := listCloudProviderServices("aws")
	require.Nil(apiErr)
	testSvcId := services[0].Id
	require.Nil(services[0].Config)

	// should be able to configure a service for a connected account
	testCloudAccountId := "546311234"
	testConnectedAccount := makeTestConnectedAccount(t, controller, testCloudAccountId)
	require.Nil(testConnectedAccount.RemovedAt)

	svcDetails, apiErr := controller.GetServiceDetails(
		context.TODO(), "aws", testSvcId, &testCloudAccountId,
	)
	require.Nil(apiErr)
	require.Equal(testSvcId, svcDetails.Id)
	require.Nil(svcDetails.Config)

	testSvcConfig := CloudServiceConfig{
		Metrics: &CloudServiceMetricsConfig{
			Enabled: true,
		},
	}
	resp, apiErr := controller.UpdateServiceConfig(
		context.TODO(), "aws", testCloudAccountId, testSvcId, testSvcConfig,
	)
	require.Nil(apiErr)
	require.Equal(testSvcId, resp.Id)
	require.Equal(testSvcConfig, resp.Config)

	svcDetails, apiErr = controller.GetServiceDetails(
		context.TODO(), "aws", testSvcId, &testCloudAccountId,
	)
	require.Nil(apiErr)
	require.Equal(testSvcId, svcDetails.Id)
	require.Equal(testSvcConfig, *svcDetails.Config)

	// should not be able to configure a service for
	// a cloud account id that is not connected yet
	require.Equal(1, 2)

}

func makeTestConnectedAccount(t *testing.T, controller *Controller, cloudAccountId string) *AccountRecord {
	require := require.New(t)

	testAccountId := uuid.NewString()
	resp, apiErr := controller.CheckInAsAgent(
		context.TODO(), "aws", AgentCheckInRequest{
			AccountId:      testAccountId,
			CloudAccountId: cloudAccountId,
		},
	)
	require.Nil(apiErr)
	require.Equal(testAccountId, resp.Account.Id)
	require.Equal(cloudAccountId, *resp.Account.CloudAccountId)

	return &resp.Account

}
