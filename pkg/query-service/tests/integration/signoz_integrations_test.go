package tests

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime/debug"
	"testing"

	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
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

	// Installing an integration should make it visible in pipelines list
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
		len(testIntegrationPipelines), len(getPipelinesResp.Pipelines),
		"Pipelines for installed integrations should appear in pipelines list",
	)

	// Uninstalling an integration should remove its pipelines
	// from pipelines list in the UI
	integrationsTB.RequestQSToUninstallIntegration(
		testIntegration.Id,
	)
	getPipelinesResp = pipelinesTB.GetPipelinesFromQS()
	require.Equal(
		0, len(getPipelinesResp.Pipelines),
		"Pipelines for uninstalled integrations should get removed from pipelines list",
	)
}

type IntegrationsTestBed struct {
	t             *testing.T
	testUser      *model.User
	qsHttpHandler http.Handler
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
	fmt.Printf("\n\n%s\n\n", string(dataJson))
	var integrationResp integrations.Integration
	err = json.Unmarshal(dataJson, &integrationResp)
	if err != nil {
		tb.t.Fatalf("could not unmarshal apiResponse.Data json into PipelinesResponse")
	}

	return &integrationResp
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

// testDB can be injected for sharing a DB across multiple integration testbeds.
func NewIntegrationsTestBed(t *testing.T, testDB *sqlx.DB) *IntegrationsTestBed {
	if testDB == nil {
		testDB = utils.NewQueryServiceDBForTests(t)
	}

	controller, err := integrations.NewController(testDB)
	if err != nil {
		t.Fatalf("could not create integrations controller: %v", err)
	}

	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		AppDao:                 dao.DB(),
		IntegrationsController: controller,
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
		t:             t,
		testUser:      user,
		qsHttpHandler: router,
	}
}
