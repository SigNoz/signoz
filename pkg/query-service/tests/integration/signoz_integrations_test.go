package tests

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime/debug"
	"slices"
	"testing"

	"github.com/jmoiron/sqlx"
	mockhouse "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

// Higher level tests for UI facing APIs

func TestSignozIntegrationLifeCycle(t *testing.T) {
	require := require.New(t)
	testbed := NewIntegrationsTestBed(t, nil)

	installedResp := testbed.GetInstalledIntegrationsFromQS()
	require.Equal(
		len(installedResp.Integrations), 0,
		"no integrations should be installed at the beginning",
	)

	availableResp := testbed.GetAvailableIntegrationsFromQS()
	availableIntegrations := availableResp.Integrations
	require.Greater(
		len(availableIntegrations), 0,
		"some integrations should come bundled with SigNoz",
	)

	// Should be able to install integration
	require.False(availableIntegrations[0].IsInstalled)
	testbed.RequestQSToInstallIntegration(
		availableIntegrations[0].Id, map[string]interface{}{},
	)

	ii := testbed.GetIntegrationDetailsFromQS(availableIntegrations[0].Id)
	require.Equal(ii.Id, availableIntegrations[0].Id)
	require.NotNil(ii.Installation)

	installedResp = testbed.GetInstalledIntegrationsFromQS()
	installedIntegrations := installedResp.Integrations
	require.Equal(len(installedIntegrations), 1)
	require.Equal(installedIntegrations[0].Id, availableIntegrations[0].Id)

	availableResp = testbed.GetAvailableIntegrationsFromQS()
	availableIntegrations = availableResp.Integrations
	require.Greater(len(availableIntegrations), 0)

	// Integration connection status should get updated after signal data has been received.
	testbed.mockLogQueryResponse([]model.SignozLog{})
	connectionStatus := testbed.GetIntegrationConnectionStatus(ii.Id)
	require.NotNil(connectionStatus)
	require.Nil(connectionStatus.Logs)

	testLog := makeTestSignozLog("test log body", map[string]interface{}{
		"source": "nginx",
	})
	testbed.mockLogQueryResponse([]model.SignozLog{testLog})
	connectionStatus = testbed.GetIntegrationConnectionStatus(ii.Id)
	require.NotNil(connectionStatus)
	require.NotNil(connectionStatus.Logs)
	require.Equal(connectionStatus.Logs.LastReceivedTsMillis, int64(testLog.Timestamp/1000000))

	// Should be able to uninstall integration
	require.True(availableIntegrations[0].IsInstalled)
	testbed.RequestQSToUninstallIntegration(
		availableIntegrations[0].Id,
	)

	ii = testbed.GetIntegrationDetailsFromQS(availableIntegrations[0].Id)
	require.Equal(ii.Id, availableIntegrations[0].Id)
	require.Nil(ii.Installation)

	installedResp = testbed.GetInstalledIntegrationsFromQS()
	installedIntegrations = installedResp.Integrations
	require.Equal(len(installedIntegrations), 0)

	availableResp = testbed.GetAvailableIntegrationsFromQS()
	availableIntegrations = availableResp.Integrations
	require.Greater(len(availableIntegrations), 0)
	require.False(availableIntegrations[0].IsInstalled)
}

func TestLogPipelinesForInstalledSignozIntegrations(t *testing.T) {
	require := require.New(t)

	testDB := utils.NewQueryServiceDBForTests(t)
	integrationsTB := NewIntegrationsTestBed(t, testDB)
	pipelinesTB := NewLogPipelinesTestBed(t, testDB)

	availableIntegrationsResp := integrationsTB.GetAvailableIntegrationsFromQS()
	availableIntegrations := availableIntegrationsResp.Integrations
	require.Greater(
		len(availableIntegrations), 0,
		"some integrations should come bundled with SigNoz",
	)

	getPipelinesResp := pipelinesTB.GetPipelinesFromQS()
	require.Equal(
		0, len(getPipelinesResp.Pipelines),
		"There should be no pipelines at the start",
	)

	// Add a dummy user created pipeline
	postablePipelines := logparsingpipeline.PostablePipelines{
		Pipelines: []logparsingpipeline.PostablePipeline{
			{
				OrderId: 1,
				Name:    "pipeline1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "method",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
							},
							Operator: "=",
							Value:    "GET",
						},
					},
				},
				Config: []logparsingpipeline.PipelineOperator{
					{
						OrderId: 1,
						ID:      "add",
						Type:    "add",
						Field:   "attributes.test",
						Value:   "val",
						Enabled: true,
						Name:    "test add",
					},
				},
			},
		},
	}

	createPipelinesResp := pipelinesTB.PostPipelinesToQS(postablePipelines)
	assertPipelinesResponseMatchesPostedPipelines(
		t, postablePipelines, createPipelinesResp,
	)
	pipelinesTB.assertPipelinesSentToOpampClient(createPipelinesResp.Pipelines)
	pipelinesTB.assertNewAgentGetsPipelinesOnConnection(createPipelinesResp.Pipelines)

	// Should be able to get the configured pipelines.
	getPipelinesResp = pipelinesTB.GetPipelinesFromQS()
	require.Equal(
		1, len(getPipelinesResp.Pipelines),
		"There should be no pipelines at the start",
	)

	// TODO(Raj): Maybe find an integration with non-zero bundled pipelines explicitly

	// Installing an integration should add its pipelines to pipelines list
	require.False(availableIntegrations[0].IsInstalled)
	integrationsTB.RequestQSToInstallIntegration(
		availableIntegrations[0].Id, map[string]interface{}{},
	)

	testIntegration := integrationsTB.GetIntegrationDetailsFromQS(availableIntegrations[0].Id)
	require.Equal(testIntegration.Id, availableIntegrations[0].Id)
	require.NotNil(testIntegration.Installation)
	testIntegrationPipelines := testIntegration.Assets.Logs.Pipelines
	require.Greater(
		len(testIntegrationPipelines), 0,
		"test integration expected to have a pipeline",
	)

	getPipelinesResp = pipelinesTB.GetPipelinesFromQS()
	require.Equal(
		1+len(testIntegrationPipelines), len(getPipelinesResp.Pipelines),
		"Pipelines for installed integrations should appear in pipelines list",
	)
	lastPipeline := getPipelinesResp.Pipelines[len(getPipelinesResp.Pipelines)-1]
	require.NotNil(integrations.IntegrationIdForPipeline(lastPipeline))
	require.Equal(testIntegration.Id, integrations.IntegrationIdForPipeline(lastPipeline))

	pipelinesTB.assertPipelinesSentToOpampClient(getPipelinesResp.Pipelines)
	pipelinesTB.assertNewAgentGetsPipelinesOnConnection(getPipelinesResp.Pipelines)

	// Reordering integration pipelines should be possible.
	postables := postableFromPipelines(getPipelinesResp.Pipelines)
	slices.Reverse(postables.Pipelines)
	for i, p := range postables.Pipelines {
		p.OrderId = i + 1
	}

	firstPipeline := getPipelinesResp.Pipelines[0]
	require.NotNil(integrations.IntegrationIdForPipeline(firstPipeline))
	require.Equal(testIntegration.Id, integrations.IntegrationIdForPipeline(firstPipeline))

	updatePipelinesResponse := pipelinesTB.PostPipelinesToQS(postables)
	pipelinesTB.assertPipelinesSentToOpampClient(updatePipelinesResponse.Pipelines)
	pipelinesTB.assertNewAgentGetsPipelinesOnConnection(updatePipelinesResponse.Pipelines)

	// enabling/disabling integration pipelines should be possible.

	// should not be able to edit integrations pipeline.

	// should not be able to delete integrations pipeline

	// Uninstalling an integration should remove its pipelines
	// from pipelines list in the UI
	integrationsTB.RequestQSToUninstallIntegration(
		testIntegration.Id,
	)
	getPipelinesResp = pipelinesTB.GetPipelinesFromQS()
	require.Equal(
		1, len(getPipelinesResp.Pipelines),
		"Pipelines for uninstalled integrations should get removed from pipelines list",
	)
}

type IntegrationsTestBed struct {
	t              *testing.T
	testUser       *model.User
	qsHttpHandler  http.Handler
	mockClickhouse mockhouse.ClickConnMockCommon
}

func (tb *IntegrationsTestBed) GetAvailableIntegrationsFromQS() *integrations.IntegrationsListResponse {
	result := tb.RequestQS("/api/v1/integrations", nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	var integrationsResp integrations.IntegrationsListResponse
	err = json.Unmarshal(dataJson, &integrationsResp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into PipelinesResponse")
	}

	return &integrationsResp
}

func (tb *IntegrationsTestBed) GetInstalledIntegrationsFromQS() *integrations.IntegrationsListResponse {
	result := tb.RequestQS("/api/v1/integrations?is_installed=true", nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	var integrationsResp integrations.IntegrationsListResponse
	err = json.Unmarshal(dataJson, &integrationsResp)
	if err != nil {
		tb.t.Fatalf(" could not unmarshal apiResponse.Data json into PipelinesResponse")
	}

	return &integrationsResp
}

func (tb *IntegrationsTestBed) GetIntegrationDetailsFromQS(
	integrationId string,
) *integrations.Integration {
	result := tb.RequestQS(fmt.Sprintf(
		"/api/v1/integrations/%s", integrationId,
	), nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	var integrationResp integrations.Integration
	err = json.Unmarshal(dataJson, &integrationResp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json")
	}

	return &integrationResp
}

func (tb *IntegrationsTestBed) GetIntegrationConnectionStatus(
	integrationId string,
) *integrations.IntegrationConnectionStatus {
	result := tb.RequestQS(fmt.Sprintf(
		"/api/v1/integrations/%s/connection_status", integrationId,
	), nil)

	dataJson, err := json.Marshal(result.Data)
	if err != nil {
		tb.t.Fatalf("could not marshal apiResponse.Data: %v", err)
	}
	var connectionStatus integrations.IntegrationConnectionStatus
	err = json.Unmarshal(dataJson, &connectionStatus)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json")
	}

	return &connectionStatus
}

func (tb *IntegrationsTestBed) RequestQSToInstallIntegration(
	integrationId string, config map[string]interface{},
) {
	request := integrations.InstallIntegrationRequest{
		IntegrationId: integrationId,
		Config:        config,
	}
	tb.RequestQS("/api/v1/integrations/install", request)
}

func (tb *IntegrationsTestBed) RequestQSToUninstallIntegration(
	integrationId string,
) {
	request := integrations.UninstallIntegrationRequest{
		IntegrationId: integrationId,
	}
	tb.RequestQS("/api/v1/integrations/uninstall", request)
}

func (tb *IntegrationsTestBed) RequestQS(
	path string,
	postData interface{},
) *app.ApiResponse {
	req, err := NewAuthenticatedTestRequest(
		tb.testUser, path, postData,
	)
	if err != nil {
		tb.t.Fatalf("couldn't create authenticated test request: %v", err)
	}

	respWriter := httptest.NewRecorder()
	tb.qsHttpHandler.ServeHTTP(respWriter, req)
	response := respWriter.Result()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		tb.t.Fatalf("couldn't read response body received from QS: %v", err)
	}

	if response.StatusCode != 200 {
		tb.t.Fatalf(
			"unexpected response status from query service for path %s. status: %d, body: %v\n%v",
			path, response.StatusCode, string(responseBody), string(debug.Stack()),
		)
	}

	var result app.ApiResponse
	err = json.Unmarshal(responseBody, &result)
	if err != nil {
		tb.t.Fatalf(
			"Could not unmarshal QS response into an ApiResponse.\nResponse body: %s",
			string(responseBody),
		)
	}

	return &result
}

func (tb *IntegrationsTestBed) mockLogQueryResponse(logsInResponse []model.SignozLog) {
	addLogsQueryExpectation(tb.mockClickhouse, logsInResponse)
}

// testDB can be injected for sharing a DB across multiple integration testbeds.
func NewIntegrationsTestBed(t *testing.T, testDB *sqlx.DB) *IntegrationsTestBed {
	if testDB == nil {
		testDB = utils.NewQueryServiceDBForTests(t)
	}

	controller, err := integrations.NewController(testDB)
	if err != nil {
		t.Fatalf("could not create integrations controller: %v", err)
	}

	fm := featureManager.StartManager()
	reader, mockClickhouse := NewMockClickhouseReader(t, testDB, fm)

	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		Reader:                 reader,
		AppDao:                 dao.DB(),
		IntegrationsController: controller,
		FeatureFlags:           fm,
	})
	if err != nil {
		t.Fatalf("could not create a new ApiHandler: %v", err)
	}

	router := app.NewRouter()
	am := app.NewAuthMiddleware(auth.GetUserFromRequest)
	apiHandler.RegisterIntegrationRoutes(router, am)

	user, apiErr := createTestUser()
	if apiErr != nil {
		t.Fatalf("could not create a test user: %v", apiErr)
	}

	return &IntegrationsTestBed{
		t:              t,
		testUser:       user,
		qsHttpHandler:  router,
		mockClickhouse: mockClickhouse,
	}
}

func postableFromPipelines(pipelines []logparsingpipeline.Pipeline) logparsingpipeline.PostablePipelines {
	result := logparsingpipeline.PostablePipelines{}

	for _, p := range pipelines {
		postable := logparsingpipeline.PostablePipeline{
			Id:      p.Id,
			OrderId: p.OrderId,
			Name:    p.Name,
			Alias:   p.Alias,
			Enabled: p.Enabled,
			Config:  p.Config,
		}

		if p.Description != nil {
			postable.Description = *p.Description
		}

		if p.Filter != nil {
			postable.Filter = p.Filter
		}

		result.Pipelines = append(result.Pipelines, postable)
	}

	return result
}
