package cloudintegrations

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
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
}
