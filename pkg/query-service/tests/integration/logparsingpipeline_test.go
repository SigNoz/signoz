package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"io/ioutil"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	opampModel "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
	"golang.org/x/exp/maps"
)

func TestLogPipelinesLifecycle(t *testing.T) {
	testbed := NewLogPipelinesTestBed(t)

	getPipelinesResp := testbed.GetPipelinesFromQS(t)
	assert.Equal(
		t, len(getPipelinesResp.Pipelines), 0,
		"There should be no pipelines at the start",
	)
	assert.Equal(
		t, len(getPipelinesResp.History), 0,
		"There should be no pipelines config history at the start",
	)

	// Should be able to create pipelines config
	postablePipelines := logparsingpipeline.PostablePipelines{
		Pipelines: []logparsingpipeline.PostablePipeline{
			{
				OrderId: 1,
				Name:    "pipeline1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  "attributes.method == \"GET\"",
				Config: []model.PipelineOperator{
					{
						OrderId: 1,
						ID:      "add",
						Type:    "add",
						Field:   "body.test",
						Value:   "val",
						Enabled: true,
						Name:    "test add",
					},
				},
			}, {
				OrderId: 2,
				Name:    "pipeline2",
				Alias:   "pipeline2",
				Enabled: true,
				Filter:  "attributes.method == \"GET\"",
				Config: []model.PipelineOperator{
					{
						OrderId: 1,
						ID:      "remove",
						Type:    "remove",
						Field:   "body.test",
						Enabled: true,
						Name:    "test remove",
					},
				},
			},
		},
	}

	createPipelinesResp := testbed.PostPipelinesToQS(
		t, postablePipelines,
	)
	assertPipelinesMatchPostedPipelines(
		t, createPipelinesResp.Pipelines, postablePipelines,
	)

	testbed.assertOpampClientReceivedConfigWithPipelines(t, createPipelinesResp.Pipelines)

	// Should be able to get the created pipelines.
	getPipelinesResp = testbed.GetPipelinesFromQS(t)
	assertPipelinesMatchPostedPipelines(
		t, getPipelinesResp.Pipelines, postablePipelines,
	)

	// Deployment status should be pending.
	assert.Equal(t, 1, len(createPipelinesResp.History))
	assert.Equal(t, agentConf.DeployInitiated, createPipelinesResp.History[0].DeployStatus)
	assert.Equal(t, agentConf.DeployInitiated, getPipelinesResp.History[0].DeployStatus)

	// Deployment status should get updated after acknowledgement from opamp client
	testbed.simulateOpampClientAppliedLastReceivedConfig()

	getPipelinesResp = testbed.GetPipelinesFromQS(t)
	assertPipelinesMatchPostedPipelines(
		t, getPipelinesResp.Pipelines, postablePipelines,
	)

	assert.Equal(t, getPipelinesResp.History[0].DeployStatus, agentConf.Deployed)

	// Should be able to update pipeline.
	postablePipelines.Pipelines[1].Enabled = false
	updatePipelinesResp := testbed.PostPipelinesToQS(
		t, postablePipelines,
	)
	assertPipelinesMatchPostedPipelines(
		t, updatePipelinesResp.Pipelines, postablePipelines,
	)

	testbed.assertOpampClientReceivedConfigWithPipelines(
		t, updatePipelinesResp.Pipelines,
	)

	// History should have 2 items now and the latest version should be pending deployment.
	assert.Equal(t, 2, len(updatePipelinesResp.History))
	assert.Equal(t, agentConf.DeployInitiated, updatePipelinesResp.History[0].DeployStatus)

	// Deployment status should get updated again on receiving msg from client.
	testbed.simulateOpampClientAppliedLastReceivedConfig()

	getPipelinesResp = testbed.GetPipelinesFromQS(t)
	assertPipelinesMatchPostedPipelines(
		t, getPipelinesResp.Pipelines, postablePipelines,
	)

	assert.Equal(t, 2, len(getPipelinesResp.History))
	assert.Equal(t, getPipelinesResp.History[0].DeployStatus, agentConf.Deployed)
}

type LogPipelinesTestBed struct {
	TestUser        *model.User
	ApiHandler      *app.APIHandler
	OpampServer     *opamp.Server
	OpampClientConn *mockOpAmpConnection
}

func NewLogPipelinesTestBed(t *testing.T) *LogPipelinesTestBed {
	// Create a tmp file based sqlite db for testing.
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatal(err)
	}
	testDBFilePath := testDBFile.Name()
	t.Cleanup(func() {
		os.Remove(testDBFilePath)
	})
	testDBFile.Close()

	dao.InitDao("sqlite", testDBFilePath)

	testDB, err := sqlx.Open("sqlite3", testDBFilePath)
	if err != nil {
		t.Fatal(err)
	}
	controller, err := logparsingpipeline.NewLogParsingPipelinesController(testDB, "sqlite")
	if err != nil {
		t.Fatal(err)
	}

	apiHandler, err := app.NewAPIHandler(app.APIHandlerOpts{
		AppDao:                        dao.DB(),
		LogsParsingPipelineController: controller,
	})
	if err != nil {
		t.Fatal(err)
	}

	opampServer, clientConn, err := mockOpampAgent(testDBFilePath)
	if err != nil {
		t.Fatal(err)
	}

	user, apiErr := createTestUser()
	if apiErr != nil {
		t.Fatal(apiErr)
	}

	return &LogPipelinesTestBed{
		TestUser:        user,
		ApiHandler:      apiHandler,
		OpampServer:     opampServer,
		OpampClientConn: clientConn,
	}
}

func (tb *LogPipelinesTestBed) PostPipelinesToQSExpectingStatusCode(
	t *testing.T,
	postablePipelines logparsingpipeline.PostablePipelines,
	expectedStatusCode int,
) *logparsingpipeline.PipelinesResponse {
	req, err := NewAuthenticatedTestRequest(
		tb.TestUser, "/api/v1/logs/pipelines", postablePipelines,
	)
	if err != nil {
		t.Fatalf("couldn't create authenticated test request: %v", err)
	}

	respWriter := httptest.NewRecorder()
	tb.ApiHandler.CreateLogsPipeline(respWriter, req)

	response := respWriter.Result()
	responseBody, err := ioutil.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("couldn't read response body received from posting pipelines to QS: %v", err)
	}

	var result app.ApiResponse
	err = json.Unmarshal(responseBody, &result)
	if err != nil {
		t.Fatalf(
			"Could not unmarshal QS response into an ApiResponse.\nResponse body: %s",
			responseBody,
		)
	}

	if response.StatusCode != expectedStatusCode {
		t.Fatalf(
			"Received response status %d from posting log pipelines. Expected: %d",
			response.StatusCode, expectedStatusCode,
		)
	}

	pipelinesResp, err := unmarshalPipelinesResponse(&result)
	if err != nil {
		t.Fatal(err)
	}
	return pipelinesResp
}

func (tb *LogPipelinesTestBed) PostPipelinesToQS(
	t *testing.T,
	postablePipelines logparsingpipeline.PostablePipelines,
) *logparsingpipeline.PipelinesResponse {
	return tb.PostPipelinesToQSExpectingStatusCode(
		t, postablePipelines, 200,
	)
}

func (tb *LogPipelinesTestBed) GetPipelinesFromQS(t *testing.T) *logparsingpipeline.PipelinesResponse {
	req, err := NewAuthenticatedTestRequest(
		tb.TestUser, "/api/v1/logs/pipelines/latest", nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	req = mux.SetURLVars(req, map[string]string{
		"version": "latest",
	})

	respWriter := httptest.NewRecorder()
	tb.ApiHandler.ListLogsPipelinesHandler(respWriter, req)
	response := respWriter.Result()
	responseBody, err := ioutil.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}

	if response.StatusCode != 200 {
		t.Fatalf(
			"could not list log parsing pipelines. status: %d, body: %v",
			response.StatusCode, responseBody,
		)
	}

	var result app.ApiResponse
	err = json.Unmarshal(responseBody, &result)
	if err != nil {
		t.Fatal(err)
	}
	pipelinesResp, err := unmarshalPipelinesResponse(&result)
	if err != nil {
		t.Fatal(err)
	}
	return pipelinesResp
}

func (tb *LogPipelinesTestBed) assertOpampClientReceivedConfigWithPipelines(
	t *testing.T, pipelines []model.Pipeline,
) {
	// Should have sent the new effective config to opamp client.
	lastMsg := tb.OpampClientConn.latestMsgFromServer()
	otelConfigFiles := lastMsg.RemoteConfig.Config.ConfigMap
	assert.Equal(t, len(otelConfigFiles), 1)

	otelConfigYaml := maps.Values(otelConfigFiles)[0].Body
	otelConfSentToClient, err := yaml.Parser().Unmarshal(otelConfigYaml)
	if err != nil {
		t.Fatal(err)
	}

	otelConfProcessors := otelConfSentToClient["processors"].(map[string]interface{})
	otelConfSvcs := otelConfSentToClient["service"].(map[string]interface{})
	otelConfLogsSvc := otelConfSvcs["pipelines"].(map[string]interface{})["logs"].(map[string]interface{})

	otelConfLogsSvcProcessorNames := otelConfLogsSvc["processors"].([]interface{})
	otelConfLogsPipelineProcNames := []string{}
	for _, procNameVal := range otelConfLogsSvcProcessorNames {
		procName := procNameVal.(string)
		if strings.HasPrefix(procName, constants.LogsPPLPfx) {
			otelConfLogsPipelineProcNames = append(
				otelConfLogsPipelineProcNames,
				procName,
			)
		}
	}

	// Each pipeline is expected to become its own processor
	// in the logs service in otel collector config.
	_, expectedLogProcessorNames, err := logparsingpipeline.PreparePipelineProcessor(pipelines)
	assert.Equal(t, expectedLogProcessorNames, otelConfLogsPipelineProcNames)

	for _, procName := range expectedLogProcessorNames {
		_, procExists := otelConfProcessors[procName]
		assert.True(t, procExists)
	}
}

func (tb *LogPipelinesTestBed) simulateOpampClientAppliedLastReceivedConfig() {
	lastMsg := tb.OpampClientConn.latestMsgFromServer()
	tb.OpampServer.OnMessage(tb.OpampClientConn, &protobufs.AgentToServer{
		InstanceUid: "test",
		EffectiveConfig: &protobufs.EffectiveConfig{
			ConfigMap: lastMsg.RemoteConfig.Config,
		},
		RemoteConfigStatus: &protobufs.RemoteConfigStatus{
			Status:               protobufs.RemoteConfigStatuses_RemoteConfigStatuses_APPLIED,
			LastRemoteConfigHash: lastMsg.RemoteConfig.ConfigHash,
		},
	})
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

func assertPipelinesMatchPostedPipelines(
	t *testing.T,
	pipelines []model.Pipeline,
	postablePipelines logparsingpipeline.PostablePipelines,
) {
	assert.Equal(
		t, len(pipelines), len(postablePipelines.Pipelines),
		"length mistmatch between pipelines and posted pipelines",
	)
	for i, pipeline := range pipelines {
		postable := postablePipelines.Pipelines[i]
		assert.Equal(t, pipeline.Name, postable.Name, "pipeline.Name mismatch")
		assert.Equal(t, pipeline.OrderId, postable.OrderId, "pipeline.OrderId mismatch")
		assert.Equal(t, pipeline.Enabled, postable.Enabled, "pipeline.Enabled mismatch")
		assert.Equal(t, pipeline.Config, postable.Config, "pipeline.Config mismatch")
	}
}

func mockOpampAgent(testDBFilePath string) (*opamp.Server, *mockOpAmpConnection, error) {
	// Mock an available opamp agent
	testDB, err := opampModel.InitDB(testDBFilePath)
	if err != nil {
		return nil, nil, err
	}
	err = agentConf.Initiate(testDB, "sqlite")
	if err != nil {
		return nil, nil, err
	}

	opampServer := opamp.InitializeServer(constants.OpAmpWsEndpoint, nil)
	opampClientConnection := &mockOpAmpConnection{}
	opampServer.OnMessage(
		opampClientConnection,
		&protobufs.AgentToServer{
			InstanceUid: "test",
			EffectiveConfig: &protobufs.EffectiveConfig{
				ConfigMap: &protobufs.AgentConfigMap{
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
				},
			},
		},
	)
	return opampServer, opampClientConnection, nil
}

func createTestUser() (*model.User, *model.ApiError) {
	// Create a test user for auth
	ctx := context.Background()
	org, apiErr := dao.DB().CreateOrg(ctx, &model.Organization{
		Name: "test",
	})
	if apiErr != nil {
		return nil, apiErr
	}

	group, apiErr := dao.DB().CreateGroup(ctx, &model.Group{
		Name: "test",
	})
	if apiErr != nil {
		return nil, apiErr
	}

	return dao.DB().CreateUser(
		ctx,
		&model.User{
			Name:     "test",
			Email:    "test@test.com",
			Password: "test",
			OrgId:    org.Id,
			GroupId:  group.Id,
		},
		true,
	)
}

func NewAuthenticatedTestRequest(
	user *model.User,
	path string,
	postData interface{},
) (*http.Request, error) {
	userJwt, err := auth.GenerateJWTForUser(user)
	if err != nil {
		return nil, err
	}

	var req *http.Request

	if postData != nil {
		var body bytes.Buffer
		err = json.NewEncoder(&body).Encode(postData)
		if err != nil {
			return nil, err
		}
		req = httptest.NewRequest(http.MethodPost, path, &body)
	} else {
		req = httptest.NewRequest(http.MethodPost, path, nil)
	}

	req.Header.Add("Authorization", "Bearer "+userJwt.AccessJwt)
	return req, nil
}

type mockOpAmpConnection struct {
	serverToAgentMsgs []*protobufs.ServerToAgent
}

func (conn *mockOpAmpConnection) Send(ctx context.Context, msg *protobufs.ServerToAgent) error {
	conn.serverToAgentMsgs = append(conn.serverToAgentMsgs, msg)
	return nil
}

func (conn *mockOpAmpConnection) latestMsgFromServer() *protobufs.ServerToAgent {
	if len(conn.serverToAgentMsgs) < 1 {
		return nil
	}
	return conn.serverToAgentMsgs[len(conn.serverToAgentMsgs)-1]
}

func (conn *mockOpAmpConnection) LatestPipelinesReceivedFromServer() ([]model.Pipeline, error) {
	pipelines := []model.Pipeline{}
	lastMsg := conn.latestMsgFromServer()
	if lastMsg == nil {
		return pipelines, nil
	}

	return pipelines, nil
	//c, err := yaml.Parser().Unmarshal([]byte(lastMsg.RemoteConfig))
}

func (conn *mockOpAmpConnection) Disconnect() error {
	return nil
}
func (conn *mockOpAmpConnection) RemoteAddr() net.Addr {
	return nil
}
