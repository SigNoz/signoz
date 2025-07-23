package tests

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http/httptest"
	"runtime/debug"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager"
	"github.com/SigNoz/signoz/pkg/analytics/analyticstest"
	"github.com/SigNoz/signoz/pkg/emailing/emailingtest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	"github.com/SigNoz/signoz/pkg/query-service/app/opamp"
	"github.com/SigNoz/signoz/pkg/query-service/app/opamp/model"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/queryBuilderToExpr"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sharder/noopsharder"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/require"
	"golang.org/x/exp/maps"
	"golang.org/x/exp/slices"
)

func TestLogPipelinesLifecycle(t *testing.T) {
	agentID := valuer.GenerateUUID().String()
	testbed := NewLogPipelinesTestBed(t, nil, agentID)
	require := require.New(t)

	getPipelinesResp := testbed.GetPipelinesFromQS()
	require.Equal(
		0, len(getPipelinesResp.Pipelines),
		"There should be no pipelines at the start",
	)
	require.Equal(
		0, len(getPipelinesResp.History),
		"There should be no pipelines config history at the start",
	)

	// Should be able to create pipelines config
	pipelineFilterSet := &v3.FilterSet{
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
	}

	postablePipelines := pipelinetypes.PostablePipelines{
		Pipelines: []pipelinetypes.PostablePipeline{
			{
				OrderID: 1,
				Name:    "pipeline1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  pipelineFilterSet,
				Config: []pipelinetypes.PipelineOperator{
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
			}, {
				OrderID: 2,
				Name:    "pipeline2",
				Alias:   "pipeline2",
				Enabled: true,
				Filter:  pipelineFilterSet,
				Config: []pipelinetypes.PipelineOperator{
					{
						OrderId: 1,
						ID:      "remove",
						Type:    "remove",
						Field:   "attributes.test",
						Enabled: true,
						Name:    "test remove",
					},
				},
			},
		},
	}

	createPipelinesResp := testbed.PostPipelinesToQS(postablePipelines)
	assertPipelinesResponseMatchesPostedPipelines(
		t, postablePipelines, createPipelinesResp,
	)
	testbed.assertPipelinesSentToOpampClient(createPipelinesResp.Pipelines)
	testbed.assertNewAgentGetsPipelinesOnConnection(createPipelinesResp.Pipelines)

	// Should be able to get the configured pipelines.
	getPipelinesResp = testbed.GetPipelinesFromQS()
	assertPipelinesResponseMatchesPostedPipelines(
		t, postablePipelines, getPipelinesResp,
	)

	// Deployment status should be pending.
	require.Equal(
		1, len(getPipelinesResp.History),
		"pipelines config history should not be empty after 1st configuration",
	)
	require.Equal(
		opamptypes.DeployInitiated, getPipelinesResp.History[0].DeployStatus,
		"pipelines deployment should be in progress after 1st configuration",
	)

	// Deployment status should get updated after acknowledgement from opamp client
	testbed.simulateOpampClientAcknowledgementForLatestConfig(agentID)

	getPipelinesResp = testbed.GetPipelinesFromQS()
	assertPipelinesResponseMatchesPostedPipelines(
		t, postablePipelines, getPipelinesResp,
	)
	require.Equal(
		opamptypes.Deployed,
		getPipelinesResp.History[0].DeployStatus,
		"pipeline deployment should be complete after acknowledgment from opamp client",
	)

	// Should be able to update pipelines config.
	postablePipelines.Pipelines[1].Enabled = false
	updatePipelinesResp := testbed.PostPipelinesToQS(postablePipelines)
	assertPipelinesResponseMatchesPostedPipelines(
		t, postablePipelines, updatePipelinesResp,
	)
	testbed.assertPipelinesSentToOpampClient(updatePipelinesResp.Pipelines)
	testbed.assertNewAgentGetsPipelinesOnConnection(updatePipelinesResp.Pipelines)

	getPipelinesResp = testbed.GetPipelinesFromQS()
	require.Equal(
		2, len(getPipelinesResp.History),
		"there should be 2 history entries after posting pipelines config for the 2nd time",
	)
	require.Equal(
		opamptypes.DeployInitiated, getPipelinesResp.History[0].DeployStatus,
		"deployment should be in progress for latest pipeline config",
	)

	// Deployment status should get updated again on receiving msg from client.
	testbed.simulateOpampClientAcknowledgementForLatestConfig(agentID)

	getPipelinesResp = testbed.GetPipelinesFromQS()
	assertPipelinesResponseMatchesPostedPipelines(
		t, postablePipelines, getPipelinesResp,
	)
	require.Equal(
		opamptypes.Deployed,
		getPipelinesResp.History[0].DeployStatus,
		"deployment for latest pipeline config should be complete after acknowledgment from opamp client",
	)
}

func TestLogPipelinesHistory(t *testing.T) {
	require := require.New(t)
	agentID := valuer.GenerateUUID().String()
	testbed := NewLogPipelinesTestBed(t, nil, agentID)

	// Only the latest config version can be "IN_PROGRESS",
	// other incomplete deployments should have status "UNKNOWN"
	getPipelinesResp := testbed.GetPipelinesFromQS()
	require.Equal(0, len(getPipelinesResp.History))

	postablePipelines := pipelinetypes.PostablePipelines{
		Pipelines: []pipelinetypes.PostablePipeline{
			{
				OrderID: 1,
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
				Config: []pipelinetypes.PipelineOperator{
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

	testbed.PostPipelinesToQS(postablePipelines)
	getPipelinesResp = testbed.GetPipelinesFromQS()
	require.Equal(1, len(getPipelinesResp.History))
	require.Equal(opamptypes.DeployInitiated, getPipelinesResp.History[0].DeployStatus)

	postablePipelines.Pipelines[0].Config = append(
		postablePipelines.Pipelines[0].Config,
		pipelinetypes.PipelineOperator{
			OrderId: 2,
			ID:      "remove",
			Type:    "remove",
			Field:   "attributes.test",
			Enabled: true,
			Name:    "test remove",
		},
	)
	postablePipelines.Pipelines[0].Config[0].Output = "remove"

	testbed.PostPipelinesToQS(postablePipelines)
	getPipelinesResp = testbed.GetPipelinesFromQS()

	require.Equal(2, len(getPipelinesResp.History))
	require.Equal(opamptypes.DeployInitiated, getPipelinesResp.History[0].DeployStatus)
	require.Equal(opamptypes.DeployStatusUnknown, getPipelinesResp.History[1].DeployStatus)
}

func TestLogPipelinesValidation(t *testing.T) {
	validPipelineFilterSet := &v3.FilterSet{
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
	}

	testCases := []struct {
		Name                       string
		Pipeline                   pipelinetypes.PostablePipeline
		ExpectedResponseStatusCode int
	}{
		{
			Name: "Valid Pipeline",
			Pipeline: pipelinetypes.PostablePipeline{
				OrderID: 1,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  validPipelineFilterSet,
				Config: []pipelinetypes.PipelineOperator{
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
			ExpectedResponseStatusCode: 200,
		},
		{
			Name: "Invalid orderId",
			Pipeline: pipelinetypes.PostablePipeline{
				OrderID: 0,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  validPipelineFilterSet,
				Config: []pipelinetypes.PipelineOperator{
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
			ExpectedResponseStatusCode: 400,
		},
		{
			Name: "Invalid filter",
			Pipeline: pipelinetypes.PostablePipeline{
				OrderID: 1,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  &v3.FilterSet{},
				Config: []pipelinetypes.PipelineOperator{
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
			ExpectedResponseStatusCode: 400,
		},
		{
			Name: "Invalid operator field",
			Pipeline: pipelinetypes.PostablePipeline{
				OrderID: 1,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  validPipelineFilterSet,
				Config: []pipelinetypes.PipelineOperator{
					{
						OrderId: 1,
						ID:      "add",
						Type:    "add",
						Field:   "bad.field",
						Value:   "val",
						Enabled: true,
						Name:    "test add",
					},
				},
			},
			ExpectedResponseStatusCode: 400,
		}, {
			Name: "Invalid from field path",
			Pipeline: pipelinetypes.PostablePipeline{
				OrderID: 1,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  validPipelineFilterSet,
				Config: []pipelinetypes.PipelineOperator{
					{
						OrderId: 1,
						ID:      "move",
						Type:    "move",
						From:    `attributes.temp_parsed_body."@l"`,
						To:      "attributes.test",
						Enabled: true,
						Name:    "test move",
					},
				},
			},
			ExpectedResponseStatusCode: 400,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.Name, func(t *testing.T) {
			agentID := valuer.GenerateUUID().String()
			testbed := NewLogPipelinesTestBed(t, nil, agentID)
			testbed.PostPipelinesToQSExpectingStatusCode(
				pipelinetypes.PostablePipelines{
					Pipelines: []pipelinetypes.PostablePipeline{tc.Pipeline},
				},
				tc.ExpectedResponseStatusCode,
			)
		})
	}
}

func TestCanSavePipelinesWithoutConnectedAgents(t *testing.T) {
	require := require.New(t)
	testbed := NewTestbedWithoutOpamp(t, nil)

	getPipelinesResp := testbed.GetPipelinesFromQS()
	require.Equal(0, len(getPipelinesResp.Pipelines))
	require.Equal(0, len(getPipelinesResp.History))

	postablePipelines := pipelinetypes.PostablePipelines{
		Pipelines: []pipelinetypes.PostablePipeline{
			{
				OrderID: 1,
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
				Config: []pipelinetypes.PipelineOperator{
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

	testbed.PostPipelinesToQS(postablePipelines)
	getPipelinesResp = testbed.GetPipelinesFromQS()
	require.Equal(1, len(getPipelinesResp.Pipelines))
	require.Equal(1, len(getPipelinesResp.History))

}

// LogPipelinesTestBed coordinates and mocks components involved in
// configuring log pipelines and provides test helpers.
type LogPipelinesTestBed struct {
	t               *testing.T
	testUser        *types.User
	apiHandler      *app.APIHandler
	agentConfMgr    *agentConf.Manager
	opampServer     *opamp.Server
	opampClientConn *opamp.MockOpAmpConnection
	store           sqlstore.SQLStore
	userModule      user.Module
	JWT             *authtypes.JWT
}

// testDB can be injected for sharing a DB across multiple integration testbeds.
func NewTestbedWithoutOpamp(t *testing.T, sqlStore sqlstore.SQLStore) *LogPipelinesTestBed {
	if sqlStore == nil {
		sqlStore = utils.NewQueryServiceDBForTests(t)
	}

	ic, err := integrations.NewController(sqlStore)
	if err != nil {
		t.Fatalf("could not create integrations controller: %v", err)
	}

	controller, err := logparsingpipeline.NewLogParsingPipelinesController(
		sqlStore, ic.GetPipelinesForInstalledIntegrations,
	)
	if err != nil {
		t.Fatalf("could not create a logparsingpipelines controller: %v", err)
	}

	providerSettings := instrumentationtest.New().ToProviderSettings()
	sharder, err := noopsharder.New(context.Background(), providerSettings, sharder.Config{})
	require.NoError(t, err)
	orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlStore), sharder)
	alertmanager, err := signozalertmanager.New(context.Background(), providerSettings, alertmanager.Config{Signoz: alertmanager.Signoz{PollInterval: 10 * time.Second, Config: alertmanagerserver.NewConfig()}}, sqlStore, orgGetter)
	require.NoError(t, err)
	jwt := authtypes.NewJWT("", 1*time.Hour, 1*time.Hour)
	emailing := emailingtest.New()
	analytics := analyticstest.New()
	modules := signoz.NewModules(sqlStore, jwt, emailing, providerSettings, orgGetter, alertmanager, analytics)
	handlers := signoz.NewHandlers(modules)

	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		LogsParsingPipelineController: controller,
		Signoz: &signoz.SigNoz{
			Modules:  modules,
			Handlers: handlers,
		},
	})
	if err != nil {
		t.Fatalf("could not create a new ApiHandler: %v", err)
	}

	// organizationModule := implorganization.NewModule(implorganization.NewStore(store))
	user, apiErr := createTestUser(modules.OrgSetter, modules.User)
	if apiErr != nil {
		t.Fatalf("could not create a test user: %v", apiErr)
	}

	// Mock an available opamp agent
	require.Nil(t, err, "failed to init opamp model")

	agentConfMgr, err := agentConf.Initiate(&agentConf.ManagerOptions{
		Store: sqlStore,
		AgentFeatures: []agentConf.AgentFeature{
			apiHandler.LogsParsingPipelineController,
		}})
	require.Nil(t, err, "failed to init agentConf")

	return &LogPipelinesTestBed{
		t:            t,
		testUser:     user,
		apiHandler:   apiHandler,
		agentConfMgr: agentConfMgr,
		store:        sqlStore,
		userModule:   modules.User,
		JWT:          jwt,
	}
}

func NewLogPipelinesTestBed(t *testing.T, testDB sqlstore.SQLStore, agentID string) *LogPipelinesTestBed {
	testbed := NewTestbedWithoutOpamp(t, testDB)

	providerSettings := instrumentationtest.New().ToProviderSettings()
	sharder, err := noopsharder.New(context.Background(), providerSettings, sharder.Config{})
	require.Nil(t, err)
	orgGetter := implorganization.NewGetter(implorganization.NewStore(testbed.store), sharder)

	model.Init(testbed.store, slog.Default(), orgGetter)

	opampServer := opamp.InitializeServer(nil, testbed.agentConfMgr, instrumentationtest.New())
	err = opampServer.Start(opamp.GetAvailableLocalAddress())
	require.Nil(t, err, "failed to start opamp server")

	t.Cleanup(func() {
		opampServer.Stop()
	})

	opampClientConnection := &opamp.MockOpAmpConnection{}
	opampServer.OnMessage(
		context.Background(),
		opampClientConnection,
		&protobufs.AgentToServer{
			InstanceUid: []byte(agentID),
			EffectiveConfig: &protobufs.EffectiveConfig{
				ConfigMap: newInitialAgentConfigMap(),
			},
		},
	)

	testbed.opampServer = opampServer
	testbed.opampClientConn = opampClientConnection

	return testbed

}

func (tb *LogPipelinesTestBed) PostPipelinesToQSExpectingStatusCode(
	postablePipelines pipelinetypes.PostablePipelines,
	expectedStatusCode int,
) *logparsingpipeline.PipelinesResponse {
	req, err := AuthenticatedRequestForTest(
		tb.userModule, tb.testUser, "/api/v1/logs/pipelines", postablePipelines,
	)
	if err != nil {
		tb.t.Fatalf("couldn't create authenticated test request: %v", err)
	}

	respWriter := httptest.NewRecorder()

	ctx, err := tb.JWT.ContextFromRequest(req.Context(), req.Header.Get("Authorization"))
	if err != nil {
		tb.t.Fatalf("couldn't get jwt from request: %v", err)
	}

	req = req.WithContext(ctx)
	tb.apiHandler.CreateLogsPipeline(respWriter, req)

	response := respWriter.Result()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		tb.t.Fatalf("couldn't read response body received from posting pipelines to QS: %v", err)
	}

	if response.StatusCode != expectedStatusCode {
		tb.t.Fatalf(
			"Received response status %d after posting log pipelines. Expected: %d\nResponse body:%s\n",
			response.StatusCode, expectedStatusCode, string(responseBody),
		)
	}

	var result app.ApiResponse
	err = json.Unmarshal(responseBody, &result)
	if err != nil {
		tb.t.Fatalf(
			"Could not unmarshal QS response into an ApiResponse.\nResponse body: %s",
			responseBody,
		)
	}

	pipelinesResp, err := unmarshalPipelinesResponse(&result)
	if err != nil {
		tb.t.Fatalf("could not extract PipelinesResponse from apiResponse: %v", err)
	}
	return pipelinesResp
}

func (tb *LogPipelinesTestBed) PostPipelinesToQS(
	postablePipelines pipelinetypes.PostablePipelines,
) *logparsingpipeline.PipelinesResponse {
	return tb.PostPipelinesToQSExpectingStatusCode(
		postablePipelines, 200,
	)
}

func (tb *LogPipelinesTestBed) GetPipelinesFromQS() *logparsingpipeline.PipelinesResponse {
	req, err := AuthenticatedRequestForTest(
		tb.userModule, tb.testUser, "/api/v1/logs/pipelines/latest", nil,
	)
	if err != nil {
		tb.t.Fatalf("couldn't create authenticated test request: %v", err)
	}
	req = mux.SetURLVars(req, map[string]string{
		"version": "latest",
	})

	respWriter := httptest.NewRecorder()
	tb.apiHandler.ListLogsPipelinesHandler(respWriter, req)
	response := respWriter.Result()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		tb.t.Fatalf("couldn't read response body received from QS: %v", err)
	}

	if response.StatusCode != 200 {
		tb.t.Fatalf(
			"could not list log parsing pipelines. status: %d, body: %v\n%s",
			response.StatusCode, string(responseBody), string(debug.Stack()),
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
	pipelinesResp, err := unmarshalPipelinesResponse(&result)
	if err != nil {
		tb.t.Fatalf("could not extract PipelinesResponse from apiResponse: %v", err)
	}
	return pipelinesResp
}

func (tb *LogPipelinesTestBed) assertPipelinesSentToOpampClient(
	pipelines []pipelinetypes.GettablePipeline,
) {
	lastMsg := tb.opampClientConn.LatestMsgFromServer()
	assertPipelinesRecommendedInRemoteConfig(
		tb.t, lastMsg, pipelines,
	)
}

func assertPipelinesRecommendedInRemoteConfig(
	t *testing.T,
	msg *protobufs.ServerToAgent,
	gettablePipelines []pipelinetypes.GettablePipeline,
) {
	collectorConfigFiles := msg.RemoteConfig.Config.ConfigMap
	require.Equal(
		t, len(collectorConfigFiles), 1,
		"otel config sent to client is expected to contain atleast 1 file",
	)

	collectorConfigYaml := maps.Values(collectorConfigFiles)[0].Body
	collectorConfSentToClient, err := yaml.Parser().Unmarshal(collectorConfigYaml)
	if err != nil {
		t.Fatalf("could not unmarshal config file sent to opamp client: %v", err)
	}

	// Each pipeline is expected to become its own processor
	// in the logs service in otel collector config.
	collectorConfSvcs := collectorConfSentToClient["service"].(map[string]interface{})
	collectorConfLogsSvc := collectorConfSvcs["pipelines"].(map[string]interface{})["logs"].(map[string]interface{})
	collectorConfLogsSvcProcessorNames := collectorConfLogsSvc["processors"].([]interface{})
	collectorConfLogsPipelineProcNames := []string{}
	for _, procNameVal := range collectorConfLogsSvcProcessorNames {
		procName := procNameVal.(string)
		if strings.HasPrefix(procName, constants.LogsPPLPfx) {
			collectorConfLogsPipelineProcNames = append(
				collectorConfLogsPipelineProcNames,
				procName,
			)
		}
	}

	_, expectedLogProcessorNames, err := logparsingpipeline.PreparePipelineProcessor(gettablePipelines)
	require.NoError(t, err)
	require.Equal(
		t, expectedLogProcessorNames, collectorConfLogsPipelineProcNames,
		"config sent to opamp client doesn't contain expected log pipelines",
	)

	collectorConfProcessors := collectorConfSentToClient["processors"].(map[string]interface{})
	for _, procName := range expectedLogProcessorNames {
		pipelineProcessorInConf, procExists := collectorConfProcessors[procName]
		require.True(t, procExists, fmt.Sprintf(
			"%s processor not found in config sent to opamp client", procName,
		))

		// Validate that filter expr in collector conf is as expected.

		// extract expr present in collector conf processor
		pipelineProcOps := pipelineProcessorInConf.(map[string]interface{})["operators"].([]interface{})

		routerOpIdx := slices.IndexFunc(
			pipelineProcOps,
			func(op interface{}) bool { return op.(map[string]interface{})["id"] == "router_signoz" },
		)
		require.GreaterOrEqual(t, routerOpIdx, 0)
		routerOproutes := pipelineProcOps[routerOpIdx].(map[string]interface{})["routes"].([]interface{})
		pipelineFilterExpr := routerOproutes[0].(map[string]interface{})["expr"].(string)

		// find logparsingpipeline.Pipeline whose processor is being validated here
		pipelineIdx := slices.IndexFunc(
			gettablePipelines, func(p pipelinetypes.GettablePipeline) bool {
				return logparsingpipeline.CollectorConfProcessorName(p) == procName
			},
		)
		require.GreaterOrEqual(t, pipelineIdx, 0)
		expectedExpr, err := queryBuilderToExpr.Parse(gettablePipelines[pipelineIdx].Filter)
		require.Nil(t, err)
		require.Equal(t, expectedExpr, pipelineFilterExpr)
	}
}

func (tb *LogPipelinesTestBed) simulateOpampClientAcknowledgementForLatestConfig(agentID string) {
	lastMsg := tb.opampClientConn.LatestMsgFromServer()
	tb.opampServer.OnMessage(context.Background(), tb.opampClientConn, &protobufs.AgentToServer{
		InstanceUid: []byte(agentID),
		EffectiveConfig: &protobufs.EffectiveConfig{
			ConfigMap: lastMsg.RemoteConfig.Config,
		},
		RemoteConfigStatus: &protobufs.RemoteConfigStatus{
			Status:               protobufs.RemoteConfigStatuses_RemoteConfigStatuses_APPLIED,
			LastRemoteConfigHash: lastMsg.RemoteConfig.ConfigHash,
		},
	})
}

func (tb *LogPipelinesTestBed) assertNewAgentGetsPipelinesOnConnection(
	pipelines []pipelinetypes.GettablePipeline,
) {
	newAgentConn := &opamp.MockOpAmpConnection{}
	agentIDUUID := valuer.GenerateUUID()
	agentID, err := agentIDUUID.MarshalBinary()
	require.Nil(tb.t, err)
	tb.opampServer.OnMessage(
		context.Background(),
		newAgentConn,
		&protobufs.AgentToServer{
			InstanceUid: agentID,
			EffectiveConfig: &protobufs.EffectiveConfig{
				ConfigMap: newInitialAgentConfigMap(),
			},
		},
	)
	latestMsgFromServer := newAgentConn.LatestMsgFromServer()
	require.NotNil(tb.t, latestMsgFromServer)
	assertPipelinesRecommendedInRemoteConfig(
		tb.t, latestMsgFromServer, pipelines,
	)
}

func unmarshalPipelinesResponse(apiResponse *app.ApiResponse) (
	*logparsingpipeline.PipelinesResponse,
	error,
) {
	dataJson, err := json.Marshal(apiResponse.Data)
	if err != nil {
		return nil, errors.Wrap(err, "could not marshal apiResponse.Data")
	}
	var pipelinesResp logparsingpipeline.PipelinesResponse
	err = json.Unmarshal(dataJson, &pipelinesResp)
	if err != nil {
		return nil, errors.Wrap(err, "could not unmarshal apiResponse.Data json into PipelinesResponse")
	}

	return &pipelinesResp, nil
}

func assertPipelinesResponseMatchesPostedPipelines(
	t *testing.T,
	postablePipelines pipelinetypes.PostablePipelines,
	pipelinesResp *logparsingpipeline.PipelinesResponse,
) {
	require.Equal(
		t, len(postablePipelines.Pipelines), len(pipelinesResp.Pipelines),
		"length mistmatch between posted pipelines and pipelines in response",
	)
	for i, pipeline := range pipelinesResp.Pipelines {
		postable := postablePipelines.Pipelines[i]
		require.Equal(t, postable.Name, pipeline.Name, "pipeline.Name mismatch")
		require.Equal(t, postable.OrderID, pipeline.OrderID, "pipeline.OrderId mismatch")
		require.Equal(t, postable.Enabled, pipeline.Enabled, "pipeline.Enabled mismatch")
		require.Equal(t, postable.Config, pipeline.Config, "pipeline.Config mismatch")
	}
}

func newInitialAgentConfigMap() *protobufs.AgentConfigMap {
	return &protobufs.AgentConfigMap{
		ConfigMap: map[string]*protobufs.AgentConfigFile{
			"otel-collector.yaml": {
				Body: []byte(`
          receivers:
            otlp:
              protocols:
                grpc:
                  endpoint: 0.0.0.0:4317
                http:
                  endpoint: 0.0.0.0:4318
          processors:
            batch:
              send_batch_size: 10000
              send_batch_max_size: 11000
              timeout: 10s
          exporters:
            otlp:
              endpoint: otelcol2:4317
          service:
            pipelines:
              logs:
                receivers: [otlp]
                processors: [batch]
                exporters: [otlp]
        `),
				ContentType: "text/yaml",
			},
		},
	}
}
