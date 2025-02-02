package tests

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
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

func TestAWSIntegrationAccountLifecycle(t *testing.T) {
	// Test for happy path of connecting and managing AWS integration accounts

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
	require.Nil(accountStatusResp.CloudAccountId)

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
	require.Equal(testAccountId, agentCheckInResp.AccountId)
	require.Equal(testAWSAccountId, agentCheckInResp.CloudAccountId)
	require.Nil(agentCheckInResp.RemovedAt)

	// Polling for connection status from UI should now return latest status
	accountStatusResp1 := testbed.GetAccountStatusFromQS("aws", testAccountId)
	require.Equal(testAccountId, accountStatusResp1.Id)
	require.NotNil(accountStatusResp1.CloudAccountId)
	require.Equal(testAWSAccountId, *accountStatusResp1.CloudAccountId)
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
	require.Equal(testAccountId, agentCheckInResp1.AccountId)
	require.Equal(testAWSAccountId, agentCheckInResp1.CloudAccountId)
	require.Nil(agentCheckInResp1.RemovedAt)

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
	require.Equal(testAccountId, agentCheckInResp2.AccountId)
	require.Equal(testAWSAccountId, agentCheckInResp2.CloudAccountId)
	require.LessOrEqual(tsBeforeDisconnect, *agentCheckInResp2.RemovedAt)
}

func TestAWSIntegrationServices(t *testing.T) {
	require := require.New(t)

	testbed := NewCloudIntegrationsTestBed(t, nil)

	// should be able to list available cloud services.
	svcListResp := testbed.GetServicesFromQS("aws", nil)
	require.Greater(len(svcListResp.Services), 0)
	for _, svc := range svcListResp.Services {
		require.NotEmpty(svc.Id)
		require.Nil(svc.Config)
	}

	// should be able to get details of a particular service.
	svcId := svcListResp.Services[0].Id
	svcDetailResp := testbed.GetServiceDetailFromQS("aws", svcId, nil)
	require.Equal(svcId, svcDetailResp.Id)
	require.NotEmpty(svcDetailResp.Overview)
	require.Nil(svcDetailResp.Config)
	require.Nil(svcDetailResp.ConnectionStatus)

	// should be able to configure a service in the ctx of a connected account

	// create a connected account
	testAccountId := uuid.NewString()
	testAWSAccountId := "389389489489"
	testbed.CheckInAsAgentWithQS(
		"aws", cloudintegrations.AgentCheckInRequest{
			AccountId:      testAccountId,
			CloudAccountId: testAWSAccountId,
		},
	)

	testSvcConfig := cloudintegrations.CloudServiceConfig{
		Metrics: &cloudintegrations.CloudServiceMetricsConfig{
			Enabled: true,
		},
	}
	updateSvcConfigResp := testbed.UpdateServiceConfigWithQS("aws", svcId, cloudintegrations.UpdateServiceConfigRequest{
		CloudAccountId: testAWSAccountId,
		Config:         testSvcConfig,
	})
	require.Equal(svcId, updateSvcConfigResp.Id)
	require.Equal(testSvcConfig, updateSvcConfigResp.Config)

	// service list should include config when queried in the ctx of an account
	svcListResp = testbed.GetServicesFromQS("aws", &testAWSAccountId)
	require.Greater(len(svcListResp.Services), 0)
	for _, svc := range svcListResp.Services {
		if svc.Id == svcId {
			require.NotNil(svc.Config)
			require.Equal(testSvcConfig, *svc.Config)
		}
	}

	// service detail should include config and status info when
	// queried in the ctx of an account
	svcDetailResp = testbed.GetServiceDetailFromQS("aws", svcId, &testAWSAccountId)
	require.Equal(svcId, svcDetailResp.Id)
	require.NotNil(svcDetailResp.Config)
	require.Equal(testSvcConfig, *svcDetailResp.Config)

}

func TestConfigReturnedWhenAgentChecksIn(t *testing.T) {
	require := require.New(t)

	testbed := NewCloudIntegrationsTestBed(t, nil)

	// configure a connected account
	testEnabledRegions := []string{"us-east-1", "us-east-2"}
	testAccountConfig := cloudintegrations.AccountConfig{
		EnabledRegions: testEnabledRegions,
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
	require.NotEmpty(connectionUrlResp.ConnectionUrl)

	testAWSAccountId := "389389489489"
	checkinResp := testbed.CheckInAsAgentWithQS(
		"aws", cloudintegrations.AgentCheckInRequest{
			AccountId:      testAccountId,
			CloudAccountId: testAWSAccountId,
		},
	)

	require.Equal(testAccountId, checkinResp.AccountId)
	require.Equal(testAWSAccountId, checkinResp.CloudAccountId)
	require.Nil(checkinResp.RemovedAt)
	require.Equal(testEnabledRegions, checkinResp.IntegrationConfig.EnabledRegions)
	require.Empty(checkinResp.IntegrationConfig.TelemetryConfig.MetricsCollectionConfig.CloudwatchMetricsStreamFilters)

	// helper
	setServiceConfig := func(svcId string, metricsEnabled bool, logsEnabled bool) {
		testSvcConfig := cloudintegrations.CloudServiceConfig{}
		if metricsEnabled {
			testSvcConfig.Metrics = &cloudintegrations.CloudServiceMetricsConfig{
				Enabled: metricsEnabled,
			}
		}
		if logsEnabled {
			testSvcConfig.Logs = &cloudintegrations.CloudServiceLogsConfig{
				Enabled: logsEnabled,
			}
		}

		updateSvcConfigResp := testbed.UpdateServiceConfigWithQS("aws", svcId, cloudintegrations.UpdateServiceConfigRequest{
			CloudAccountId: testAWSAccountId,
			Config:         testSvcConfig,
		})
		require.Equal(svcId, updateSvcConfigResp.Id)
		require.Equal(testSvcConfig, updateSvcConfigResp.Config)
	}

	setServiceConfig("ec2", true, false)
	setServiceConfig("rds", true, true)
	checkinResp = testbed.CheckInAsAgentWithQS(
		"aws", cloudintegrations.AgentCheckInRequest{
			AccountId:      testAccountId,
			CloudAccountId: testAWSAccountId,
		},
	)

	require.Equal(testAccountId, checkinResp.AccountId)
	require.Equal(testAWSAccountId, checkinResp.CloudAccountId)
	require.Nil(checkinResp.RemovedAt)
	integrationConf := checkinResp.IntegrationConfig
	require.Equal(testEnabledRegions, integrationConf.EnabledRegions)

	metricStreamNamespaces := []string{}
	for _, f := range integrationConf.TelemetryConfig.MetricsCollectionConfig.CloudwatchMetricsStreamFilters {
		metricStreamNamespaces = append(metricStreamNamespaces, f.Namespace)
	}
	require.Equal([]string{"AWS/EC2", "AWS/RDS"}, metricStreamNamespaces)

	logGroupPrefixes := []string{}
	for _, f := range integrationConf.TelemetryConfig.LogsCollectionConfig.CloudwatchLogsSubscriptions {
		logGroupPrefixes = append(logGroupPrefixes, f.LogGroupNamePrefix)
	}
	require.Equal(1, len(logGroupPrefixes))
	require.True(strings.HasPrefix(logGroupPrefixes[0], "/aws/rds"))

	// change regions
	// disable metrics for one and logs for the other.
	// config should be as expected.
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

func (tb *CloudIntegrationsTestBed) GetServicesFromQS(
	cloudProvider string, cloudAccountId *string,
) *cloudintegrations.ListServicesResponse {
	path := fmt.Sprintf("/api/v1/cloud-integrations/%s/services", cloudProvider)
	if cloudAccountId != nil {
		path = fmt.Sprintf("%s?cloud_account_id=%s", path, *cloudAccountId)
	}

	return RequestQSAndParseResp[cloudintegrations.ListServicesResponse](
		tb, path, nil,
	)
}

func (tb *CloudIntegrationsTestBed) GetServiceDetailFromQS(
	cloudProvider string, serviceId string, cloudAccountId *string,
) *cloudintegrations.CloudServiceDetails {
	path := fmt.Sprintf("/api/v1/cloud-integrations/%s/services/%s", cloudProvider, serviceId)
	if cloudAccountId != nil {
		path = fmt.Sprintf("%s?cloud_account_id=%s", path, *cloudAccountId)
	}

	return RequestQSAndParseResp[cloudintegrations.CloudServiceDetails](
		tb, path, nil,
	)
}
func (tb *CloudIntegrationsTestBed) UpdateServiceConfigWithQS(
	cloudProvider string, serviceId string, req any,
) *cloudintegrations.UpdateServiceConfigResponse {
	path := fmt.Sprintf("/api/v1/cloud-integrations/%s/services/%s/config", cloudProvider, serviceId)

	return RequestQSAndParseResp[cloudintegrations.UpdateServiceConfigResponse](
		tb, path, req,
	)
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

func RequestQSAndParseResp[ResponseType any](
	tb *CloudIntegrationsTestBed,
	path string,
	postData interface{},
) *ResponseType {
	respDataJson := tb.RequestQS(path, postData)

	var resp ResponseType

	err := json.Unmarshal(respDataJson, &resp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into %T", resp)
	}

	return &resp
}
