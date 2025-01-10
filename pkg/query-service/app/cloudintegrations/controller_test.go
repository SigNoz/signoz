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
	account, apiErr := controller.repo.get(
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

	account, apiErr = controller.repo.get(
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
	existingConnected, apiErr := controller.repo.getConnectedCloudAccount(
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

	existingConnected, apiErr = controller.repo.getConnectedCloudAccount(
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
