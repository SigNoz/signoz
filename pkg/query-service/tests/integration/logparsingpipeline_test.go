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

	"github.com/jmoiron/sqlx"
	"github.com/open-telemetry/opamp-go/protobufs"
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

func TestCreateLogsPipeline(t *testing.T) {
	// Integration tests for logs pipeline http handlers.
	type testCase struct {
		name                       string
		postData                   *logparsingpipeline.PostablePipelines
		expectedResponseStatusCode int
	}
	testCases := []testCase{
		{
			name: "test valid pipeline",
			postData: &logparsingpipeline.PostablePipelines{
				Pipelines: []logparsingpipeline.PostablePipeline{
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
				},
			},
			expectedResponseStatusCode: 200,
		},
		{
			name: "test invalid pipeline filter",
			postData: &logparsingpipeline.PostablePipelines{
				Pipelines: []logparsingpipeline.PostablePipeline{
					{
						OrderId: 1,
						Name:    "pipeline 1",
						Alias:   "pipeline1",
						Enabled: true,
						Filter:  "bad filter statement",
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
				},
			},
			expectedResponseStatusCode: 400,
		}, {
			name: "test invalid pipeline operator",
			postData: &logparsingpipeline.PostablePipelines{
				Pipelines: []logparsingpipeline.PostablePipeline{
					{
						OrderId: 1,
						Name:    "pipeline 1",
						Alias:   "pipeline1",
						Enabled: true,
						Filter:  "true",
						Config: []model.PipelineOperator{
							{
								OrderId: 1,
								ID:      "add",
								Type:    "add",
								Field:   "badField",
								Value:   "val",
								Enabled: true,
								Name:    "test",
							},
						},
					},
				},
			},
			expectedResponseStatusCode: 400,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create a temp db file for this test
			testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
			if err != nil {
				t.Fatal(err)
			}
			testDBFilePath := testDBFile.Name()
			defer os.Remove(testDBFilePath)
			testDBFile.Close()

			err = mockOpampAgent(testDBFilePath)
			if err != nil {
				t.Fatal(err)
			}

			apiHandler, err := mockApiHandler(testDBFilePath)
			if err != nil {
				t.Fatal(err)
			}

			// Make api request
			user, apiErr := createTestUser(t)
			if apiErr != nil {
				t.Fatal(apiErr)
			}
			req, err := NewAuthenticatedPostRequest(user, "/api/v1/logs/pipelines", tc.postData)
			if err != nil {
				t.Fatal(err)
			}

			respWriter := httptest.NewRecorder()
			apiHandler.CreateLogsPipeline(respWriter, req)
			response := respWriter.Result()
			responseBody, err := ioutil.ReadAll(response.Body)
			if err != nil {
				t.Fatal(err)
			}

			// Validate response status code
			if response.StatusCode != tc.expectedResponseStatusCode {
				t.Errorf("Unexpected response status %d. Expected %d. Response body: %s",
					response.StatusCode, tc.expectedResponseStatusCode,
					responseBody,
				)
			}
		})
	}
}

func mockOpampAgent(testDBFilePath string) error {
	// Mock an available opamp agents.
	testDB, err := sqlx.Open("sqlite3", testDBFilePath)
	if err != nil {
		return err
	}
	agentConf.Initiate(testDB, "sqlite")

	opampModel.InitDB(testDBFilePath)
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
	return nil
}

func mockApiHandler(testDBFilePath string) (*app.APIHandler, error) {
	testDB, err := sqlx.Open("sqlite3", testDBFilePath)
	if err != nil {
		return nil, err
	}

	controller, err := logparsingpipeline.NewLogParsingPipelinesController(testDB, "sqlite")
	if err != nil {
		return nil, err
	}

	dao.InitDao("sqlite", testDBFilePath)
	return app.NewAPIHandler(app.APIHandlerOpts{
		AppDao:                        dao.DB(),
		LogsParsingPipelineController: controller,
	})
}

func createTestUser(t *testing.T) (*model.User, *model.ApiError) {
	// Create a test user for auth
	ctx := context.Background()
	org, apiErr := dao.DB().CreateOrg(ctx, &model.Organization{
		Name: "test",
	})
	//t.Logf("Org:%v\n\nerr:%T & %v & %v", org, err1, err1.Error(), err1)
	if apiErr != nil {
		t.Fatal(apiErr)
	}

	group, apiErr := dao.DB().CreateGroup(ctx, &model.Group{
		Name: "test",
	})
	if apiErr != nil {
		t.Fatal(apiErr)
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

func NewAuthenticatedPostRequest(
	user *model.User,
	path string,
	postData interface{},
) (*http.Request, error) {
	userJwt, err := auth.GenerateJWTForUser(user)
	if err != nil {
		return nil, err
	}
	var b bytes.Buffer
	err = json.NewEncoder(&b).Encode(postData)
	if err != nil {
		return nil, err
	}
	req := httptest.NewRequest(http.MethodPost, path, &b)
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
