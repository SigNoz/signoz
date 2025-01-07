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
	// Test for the happy path of connecting and managing AWS integration accounts

	t0 := time.Now()
	require := require.New(t)
	testbed := NewCloudIntegrationsTestBed(t, nil)

	accountsListResp := testbed.GetAccountsListFromQS("aws")
	require.Equal(len(accountsListResp.Accounts), 0,
		"No accounts should be connected at the beginning",
	)

	// Should be able to generate connection url - initializing an account
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

	// Should be able to poll for account connection status
	accountStatusResp := testbed.GetAccountStatusFromQS("aws", testAccountId)
	require.Equal(testAccountId, accountStatusResp.Id)
	require.Nil(accountStatusResp.Status.Integration.LastHeartbeatTsMillis)

	// The unconnected account should not show up in accounts list yet
	accountsListResp1 := testbed.GetAccountsListFromQS("aws")
	require.Equal(0, len(accountsListResp1.Accounts),
		"No accounts should be connected at the beginning",
	)

	// An agent should be able to check in to the new account
	// Should get the settings that were specified while generating connection url
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

	// Polling for connection status should now return latest status
	accountStatusResp1 := testbed.GetAccountStatusFromQS("aws", testAccountId)
	require.Equal(testAccountId, accountStatusResp1.Id)
	require.NotNil(accountStatusResp1.Status.Integration.LastHeartbeatTsMillis)
	require.LessOrEqual(
		tsMillisBeforeAgentCheckIn,
		*accountStatusResp1.Status.Integration.LastHeartbeatTsMillis,
	)

	// The account should now show up in list of connected accounts.
	accountsListResp2 := testbed.GetAccountsListFromQS("aws")
	require.Equal(len(accountsListResp2.Accounts), 1,
		"No accounts should be connected at the beginning",
	)
	require.Equal(testAccountId, accountsListResp2.Accounts[0].Id)
	require.Equal(testAWSAccountId, *accountsListResp2.Accounts[0].CloudAccountId)

	// Should be able to update account settings
	testAccountConfig2 := cloudintegrations.AccountConfig{
		EnabledRegions: []string{"us-east-2", "us-west-1"},
	}
	latestAccount := testbed.UpdateAccountConfigWithQS(
		"aws", testAccountId, testAccountConfig2,
	)
	require.Equal(testAccountId, latestAccount.Id)
	require.Equal(testAccountConfig2, *latestAccount.Config)

	// The agent should now receive latest settings.
	agentCheckInResp1 := testbed.CheckInAsAgentWithQS(
		"aws", cloudintegrations.AgentCheckInRequest{
			AccountId:      testAccountId,
			CloudAccountId: testAWSAccountId,
		},
	)
	require.Equal(testAccountId, agentCheckInResp1.Account.Id)
	require.Equal(testAccountConfig2, *agentCheckInResp1.Account.Config)
	require.Equal(testAWSAccountId, *agentCheckInResp1.Account.CloudAccountId)

	// Should be able to disconnect account.

	// The agent should receive the disconnected status post disconnection

	require.Equal(1, 2)
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
	reader, mockClickhouse := NewMockClickhouseReader(t, testDB, fm)
	mockClickhouse.MatchExpectationsInOrder(false)

	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		Reader:                      reader,
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
		t:              t,
		testUser:       user,
		qsHttpHandler:  router,
		mockClickhouse: mockClickhouse,
	}
}

func (tb *CloudIntegrationsTestBed) GetAccountsListFromQS(
	cloudProvider string,
) *cloudintegrations.AccountsListResponse {
	result := tb.RequestQS(fmt.Sprintf("/api/v1/cloud-integrations/%s/accounts", cloudProvider), nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}

	var resp cloudintegrations.AccountsListResponse
	err = json.Unmarshal(dataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into AccountsListResponse")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) GenerateConnectionUrlFromQS(
	cloudProvider string, req cloudintegrations.GenerateConnectionUrlRequest,
) *cloudintegrations.GenerateConnectionUrlResponse {
	result := tb.RequestQS(
		fmt.Sprintf("/api/v1/cloud-integrations/%s/accounts/generate-connection-url", cloudProvider),
		req,
	)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}

	var resp cloudintegrations.GenerateConnectionUrlResponse
	err = json.Unmarshal(dataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into map[string]any")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) GetAccountStatusFromQS(
	cloudProvider string, accountId string,
) *cloudintegrations.AccountStatusResponse {
	result := tb.RequestQS(fmt.Sprintf(
		"/api/v1/cloud-integrations/%s/accounts/%s/status",
		cloudProvider, accountId,
	), nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}

	var resp cloudintegrations.AccountStatusResponse
	err = json.Unmarshal(dataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into AccountStatusResponse")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) CheckInAsAgentWithQS(
	cloudProvider string, req cloudintegrations.AgentCheckInRequest,
) *cloudintegrations.AgentCheckInResponse {
	result := tb.RequestQS(
		fmt.Sprintf("/api/v1/cloud-integrations/%s/agent-check-in", cloudProvider), req,
	)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}

	var resp cloudintegrations.AgentCheckInResponse
	err = json.Unmarshal(dataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into AgentCheckInResponse")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) UpdateAccountConfigWithQS(
	cloudProvider string, accountId string, newConfig cloudintegrations.AccountConfig,
) *cloudintegrations.Account {
	result := tb.RequestQS(
		fmt.Sprintf(
			"/api/v1/cloud-integrations/%s/accounts/%s/config",
			cloudProvider, accountId,
		), cloudintegrations.UpdateAccountConfigRequest{
			Config: newConfig,
		},
	)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}

	var resp cloudintegrations.Account
	err = json.Unmarshal(dataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into AgentCheckInResponse")
	}

	return &resp
}

func (tb *CloudIntegrationsTestBed) RequestQS(
	path string,
	postData interface{},
) *app.ApiResponse {
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
	return result
}
