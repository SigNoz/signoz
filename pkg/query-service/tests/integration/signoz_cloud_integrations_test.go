package tests

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	mockhouse "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/cloudintegrations"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func TestAWSIntegrationLifecycle(t *testing.T) {
	// Test for happy path of connecting and managing AWS integration accounts

	t0 := time.Now()
	require := require.New(t)
	testbed := NewCloudIntegrationsTestBed(t, nil)

	accountsListResp := testbed.GetConnectedAccountsListFromQS("aws")
	require.Equal(len(accountsListResp.Accounts), 0,
		"No accounts should be connected at the beginning",
	)

	// Should be able to generate a connection url from UI - initializing an integration account
	testAccountConfig := cloudintegrations.AccountConfig{
		EnabledRegions: []string{"us-east-1", "us-east-2"},
	}
	connectionUrlResp := testbed.GenerateConnectionUrlFromQS(
		"aws", cloudintegrations.GenerateConnectionUrlRequest{
			AgentConfig: cloudintegrations.SigNozAgentConfig{
				Region: "us-east-1",
			},
			AccountConfig: testAccountConfig,
		})
	testAccountId := connectionUrlResp.AccountId
	require.NotEmpty(testAccountId)
	connectionUrl := connectionUrlResp.ConnectionUrl
	require.NotEmpty(connectionUrl)

	// Should be able to poll for account connection status from the UI
	accountStatusResp := testbed.GetAccountStatusFromQS("aws", testAccountId)
	require.Equal(testAccountId, accountStatusResp.Id)
	require.Nil(accountStatusResp.Status.Integration.LastHeartbeatTsMillis)

	// The unconnected account should not show up in connected accounts list yet
	accountsListResp1 := testbed.GetConnectedAccountsListFromQS("aws")
	require.Equal(0, len(accountsListResp1.Accounts))

	// An agent installed in user's AWS account should be able to check in for the new integration account
	tsMillisBeforeAgentCheckIn := time.Now().UnixMilli()
	testAWSAccountId := "4563215233"
	agentCheckInResp := testbed.CheckInAsAgentWithQS(
		"aws", cloudintegrations.AgentCheckInRequest{
			AccountId:      testAccountId,
			CloudAccountId: testAWSAccountId,
		},
	)
	require.Equal(testAccountId, agentCheckInResp.Account.Id)
	require.Equal(testAccountConfig, *agentCheckInResp.Account.Config)
	require.Equal(testAWSAccountId, *agentCheckInResp.Account.CloudAccountId)
	require.LessOrEqual(t0.Unix(), agentCheckInResp.Account.CreatedAt.Unix())
	require.Nil(agentCheckInResp.Account.RemovedAt)

	// Polling for connection status from UI should now return latest status
	accountStatusResp1 := testbed.GetAccountStatusFromQS("aws", testAccountId)
	require.Equal(testAccountId, accountStatusResp1.Id)
	require.NotNil(accountStatusResp1.Status.Integration.LastHeartbeatTsMillis)
	require.LessOrEqual(
		tsMillisBeforeAgentCheckIn,
		*accountStatusResp1.Status.Integration.LastHeartbeatTsMillis,
	)

	// The account should now show up in list of connected accounts.
	accountsListResp2 := testbed.GetConnectedAccountsListFromQS("aws")
	require.Equal(len(accountsListResp2.Accounts), 1)
	require.Equal(testAccountId, accountsListResp2.Accounts[0].Id)
	require.Equal(testAWSAccountId, accountsListResp2.Accounts[0].CloudAccountId)

	// Should be able to update account config from UI
	testAccountConfig2 := cloudintegrations.AccountConfig{
		EnabledRegions: []string{"us-east-2", "us-west-1"},
	}
	latestAccount := testbed.UpdateAccountConfigWithQS(
		"aws", testAccountId, testAccountConfig2,
	)
	require.Equal(testAccountId, latestAccount.Id)
	require.Equal(testAccountConfig2, *latestAccount.Config)

	// The agent should now receive latest account config.
	agentCheckInResp1 := testbed.CheckInAsAgentWithQS(
		"aws", cloudintegrations.AgentCheckInRequest{
			AccountId:      testAccountId,
			CloudAccountId: testAWSAccountId,
		},
	)
	require.Equal(testAccountId, agentCheckInResp1.Account.Id)
	require.Equal(testAccountConfig2, *agentCheckInResp1.Account.Config)
	require.Equal(testAWSAccountId, *agentCheckInResp1.Account.CloudAccountId)
	require.Nil(agentCheckInResp1.Account.RemovedAt)

	// Should be able to disconnect/remove account from UI.
	tsBeforeDisconnect := time.Now()
	latestAccount = testbed.DisconnectAccountWithQS("aws", testAccountId)
	require.Equal(testAccountId, latestAccount.Id)
	require.LessOrEqual(tsBeforeDisconnect, *latestAccount.RemovedAt)

	// The agent should receive the disconnected status in account config post disconnection
	agentCheckInResp2 := testbed.CheckInAsAgentWithQS(
		"aws", cloudintegrations.AgentCheckInRequest{
			AccountId:      testAccountId,
			CloudAccountId: testAWSAccountId,
		},
	)
	require.Equal(testAccountId, agentCheckInResp2.Account.Id)
	require.Equal(testAWSAccountId, *agentCheckInResp2.Account.CloudAccountId)
	require.LessOrEqual(tsBeforeDisconnect, *agentCheckInResp2.Account.RemovedAt)
}

type CloudIntegrationsTestBed struct {
	t              *testing.T
	testUser       *model.User
	qsHttpHandler  http.Handler
	mockClickhouse mockhouse.ClickConnMockCommon
}

// testDB can be injected for sharing a DB across multiple integration testbeds.
func NewCloudIntegrationsTestBed(t *testing.T, testDB *sqlx.DB) *CloudIntegrationsTestBed {
	if testDB == nil {
		testDB = utils.NewQueryServiceDBForTests(t)
	}

	controller, err := cloudintegrations.NewController(testDB)
	if err != nil {
		t.Fatalf("could not create cloud integrations controller: %v", err)
	}

	fm := featureManager.StartManager()
	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		AppDao:                      dao.DB(),
		CloudIntegrationsController: controller,
		FeatureFlags:                fm,
	})
	if err != nil {
		t.Fatalf("could not create a new ApiHandler: %v", err)
	}

	router := app.NewRouter()
	am := app.NewAuthMiddleware(auth.GetUserFromRequest)
	apiHandler.RegisterRoutes(router, am)
	apiHandler.RegisterCloudIntegrationsRoutes(router, am)

	user, apiErr := createTestUser()
	if apiErr != nil {
		t.Fatalf("could not create a test user: %v", apiErr)
	}

	return &CloudIntegrationsTestBed{
		t:             t,
		testUser:      user,
		qsHttpHandler: router,
	}
}

func (tb *CloudIntegrationsTestBed) GetConnectedAccountsListFromQS(
	cloudProvider string,
) *cloudintegrations.ConnectedAccountsListResponse {
	respDataJson := tb.RequestQS(fmt.Sprintf("/api/v1/cloud-integrations/%s/accounts", cloudProvider), nil)

	var resp cloudintegrations.ConnectedAccountsListResponse
	err := json.Unmarshal(respDataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into AccountsListResponse")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) GenerateConnectionUrlFromQS(
	cloudProvider string, req cloudintegrations.GenerateConnectionUrlRequest,
) *cloudintegrations.GenerateConnectionUrlResponse {
	respDataJson := tb.RequestQS(
		fmt.Sprintf("/api/v1/cloud-integrations/%s/accounts/generate-connection-url", cloudProvider),
		req,
	)

	var resp cloudintegrations.GenerateConnectionUrlResponse
	err := json.Unmarshal(respDataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into map[string]any")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) GetAccountStatusFromQS(
	cloudProvider string, accountId string,
) *cloudintegrations.AccountStatusResponse {
	respDataJson := tb.RequestQS(fmt.Sprintf(
		"/api/v1/cloud-integrations/%s/accounts/%s/status",
		cloudProvider, accountId,
	), nil)

	var resp cloudintegrations.AccountStatusResponse
	err := json.Unmarshal(respDataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into AccountStatusResponse")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) CheckInAsAgentWithQS(
	cloudProvider string, req cloudintegrations.AgentCheckInRequest,
) *cloudintegrations.AgentCheckInResponse {
	respDataJson := tb.RequestQS(
		fmt.Sprintf("/api/v1/cloud-integrations/%s/agent-check-in", cloudProvider), req,
	)

	var resp cloudintegrations.AgentCheckInResponse
	err := json.Unmarshal(respDataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into AgentCheckInResponse")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) UpdateAccountConfigWithQS(
	cloudProvider string, accountId string, newConfig cloudintegrations.AccountConfig,
) *cloudintegrations.AccountRecord {
	respDataJson := tb.RequestQS(
		fmt.Sprintf(
			"/api/v1/cloud-integrations/%s/accounts/%s/config",
			cloudProvider, accountId,
		), cloudintegrations.UpdateAccountConfigRequest{
			Config: newConfig,
		},
	)

	var resp cloudintegrations.AccountRecord
	err := json.Unmarshal(respDataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into Account")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) DisconnectAccountWithQS(
	cloudProvider string, accountId string,
) *cloudintegrations.AccountRecord {
	respDataJson := tb.RequestQS(
		fmt.Sprintf(
			"/api/v1/cloud-integrations/%s/accounts/%s/disconnect",
			cloudProvider, accountId,
		), map[string]any{},
	)

	var resp cloudintegrations.AccountRecord
	err := json.Unmarshal(respDataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into Account")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) RequestQS(
	path string,
	postData interface{},
) (responseDataJson []byte) {
	req, err := AuthenticatedRequestForTest(
		tb.testUser, path, postData,
	)
	if err != nil {
		tb.t.Fatalf("couldn't create authenticated test request: %v", err)
	}

	result, err := HandleTestRequest(tb.qsHttpHandler, req, 200)
	if err != nil {
		tb.t.Fatalf("test request failed: %v", err)
	}

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	return dataJson
}
