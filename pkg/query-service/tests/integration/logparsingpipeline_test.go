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
	"testing"

	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
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
)

func TestUpdateLogParsingPipeline(t *testing.T) {
	testbed := NewLogParsingTestBed(t)

	pipelines := testbed.GetPipelines(t)
	assert.Equal(t, len(pipelines), 0)

	// Should be able to create pipelines.
	testPipelines := []logparsingpipeline.PostablePipeline{
		{
			OrderId: 1,
			Name:    "pipeline 1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter:  "attributes.method == \"GET\"",
			Config: []model.PipelineOperator{
				{
					OrderId: 1,
					ID:      "add",
					Type:    "add",
					Field:   "body",
					Value:   "val",
					Enabled: true,
					Name:    "test",
				},
			},
		},
	}

	apiResponse, statusCode := testbed.PostPipelines(
		t, logparsingpipeline.PostablePipelines{
			Pipelines: testPipelines,
		},
	)
	if statusCode != 200 {
		t.Fatalf("Could not post pipeline %v\nresponse status: %d, body: %v", testPipelines, statusCode, apiResponse)
	}
	pipelinesResp, err := unmarshalPipelinesResponse(apiResponse)
	if err != nil {
		t.Fatal(err)
	}
	assertPipelinesMatchPostablePipelines(
		t, pipelinesResp.Pipelines, testPipelines,
	)

	pipelines = testbed.GetPipelines(t)
	assertPipelinesMatchPostablePipelines(
		t, pipelines, testPipelines,
	)
}

type LogParsingTestBed struct {
	TestUser    *model.User
	ApiHandler  *app.APIHandler
	OpampServer *opamp.Server
}

func NewLogParsingTestBed(t *testing.T) *LogParsingTestBed {
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

	opampServer, err := mockOpampAgent(testDBFilePath)
	if err != nil {
		t.Fatal(err)
	}

	user, apiErr := createTestUser()
	if apiErr != nil {
		t.Fatal(apiErr)
	}

	return &LogParsingTestBed{
		TestUser:    user,
		ApiHandler:  apiHandler,
		OpampServer: opampServer,
	}
}

func (tb *LogParsingTestBed) PostPipelines(
	t *testing.T,
	postablePipelines logparsingpipeline.PostablePipelines,
) (*app.ApiResponse, int) {
	req, err := NewAuthenticatedTestRequest(
		tb.TestUser, "/api/v1/logs/pipelines", postablePipelines,
	)
	if err != nil {
		t.Fatal(err)
	}

	respWriter := httptest.NewRecorder()
	tb.ApiHandler.CreateLogsPipeline(respWriter, req)

	response := respWriter.Result()
	responseBody, err := ioutil.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}

	var result app.ApiResponse
	err = json.Unmarshal(responseBody, &result)
	if err != nil {
		t.Fatal(err)
	}

	return &result, response.StatusCode
}

func (tb *LogParsingTestBed) GetPipelines(t *testing.T) []model.Pipeline {
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
	return pipelinesResp.Pipelines
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
		return nil, errors.Wrap(err, "could not unmarshal data json into PipelinesResponse")
	}

	return &pipelinesResp, nil
}

func assertPipelinesMatchPostablePipelines(
	t *testing.T,
	pipelines []model.Pipeline,
	postablePipelines []logparsingpipeline.PostablePipeline,
) {
	assert.Equal(t, len(pipelines), len(postablePipelines))
	for i, pipeline := range pipelines {
		postable := postablePipelines[i]
		assert.Equal(t, pipeline.Name, postable.Name)
		assert.Equal(t, pipeline.OrderId, postable.OrderId)
		assert.Equal(t, pipeline.Enabled, postable.Enabled)
		assert.Equal(t, pipeline.Config, postable.Config)
	}
}

func mockOpampAgent(testDBFilePath string) (*opamp.Server, error) {
	// Mock an available opamp agent
	testDB, err := opampModel.InitDB(testDBFilePath)
	if err != nil {
		return nil, err
	}
	err = agentConf.Initiate(testDB, "sqlite")
	if err != nil {
		return nil, err
	}

	opampServer := opamp.InitializeServer(constants.OpAmpWsEndpoint, nil)
	opampServer.OnMessage(
		&mockOpAmpConnection{},
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
	return opampServer, nil
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
}

func (conn *mockOpAmpConnection) Send(ctx context.Context, msg *protobufs.ServerToAgent) error {
	return nil
}

func (conn *mockOpAmpConnection) Disconnect() error {
	return nil
}
func (conn *mockOpAmpConnection) RemoteAddr() net.Addr {
	return nil
}
