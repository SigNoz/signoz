package opamp

import (
	"context"
	"log"
	"net"
	"os"
	"testing"

	"github.com/davecgh/go-spew/spew"
	"github.com/google/uuid"
	"github.com/knadh/koanf/parsers/yaml"
	_ "github.com/mattn/go-sqlite3"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"golang.org/x/exp/maps"
)

func TestOpAMPServerToAgentCommunicationWithConfigProvider(t *testing.T) {
	require := require.New(t)

	tb := NewTestBed(t)

	require.Equal(
		0, len(tb.testConfigProvider.Subscriptions),
		"there should be no agent config subscribers at the start",
	)

	tb.StartServer()

	require.Equal(
		1, len(tb.testConfigProvider.Subscriptions),
		"Opamp server should have subscribed to updates from config provider after being started",
	)

	// Server should not recommend any config to the agent if
	// the provider recommends agent's current config
	agent1Conn := &MockOpAmpConnection{}
	tb.opampServer.OnMessage(
		agent1Conn,
		&protobufs.AgentToServer{
			InstanceUid: "testAgent1",
			EffectiveConfig: &protobufs.EffectiveConfig{
				ConfigMap: &TestCollectorConfig,
			},
		},
	)

	require.Empty(RemoteConfigBody(agent1Conn.latestMsgFromServer()),
		"Server should not recommend any config to the agent if the provider recommends agent's current config",
	)

	// The server should recommend provided config when the agent first connects.

	// The server should report deployment status to config provider

	// The server should rollout latest config to all agents when notified of
	// a change by config provider

	// The server should unsubscribe after shutdown

}

type TestBed struct {
	testConfigProvider *TestAgentConfProvider
	opampServer        *Server
	t                  *testing.T
}

func NewTestBed(t *testing.T) *TestBed {
	// Init opamp model.
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatalf("could not create temp file for test db: %v", err)
	}
	testDBFilePath := testDBFile.Name()
	t.Cleanup(func() { os.Remove(testDBFilePath) })
	testDBFile.Close()

	_, err = model.InitDB(testDBFilePath)
	if err != nil {
		t.Fatalf("could not init opamp model: %v", err)
	}

	testConfigProvider := &TestAgentConfProvider{
		Subscriptions: map[string]func(){},
	}
	opampServer := InitializeServer(nil, testConfigProvider)

	return &TestBed{
		testConfigProvider: testConfigProvider,
		opampServer:        opampServer,
		t:                  t,
	}
}

func (tb *TestBed) StartServer() {
	testListenPath := GetAvailableLocalAddress()
	err := tb.opampServer.Start(testListenPath)
	require.Nil(tb.t, err, "should be able to start opamp server")
}

type TestAgentConfProvider struct {
	// This config provider recommends collector config
	// by adding the following zpages to supplied base config
	//
	// The test provider recommends the base conf without changes
	// if ZPagesEndpoint is empty
	ZPagesEndpoint string

	Subscriptions map[string]func()

	// { configId: { agentId: status } }
	reportedDeploymentStatuses map[string]map[string]ConfigDeploymentStatus
}

func (ta *TestAgentConfProvider) RecommendAgentConfig(baseConfYaml []byte) (
	[]byte, string, error,
) {
	if len(ta.ZPagesEndpoint) < 1 {
		return baseConfYaml, "", nil
	}

	conf, err := yaml.Parser().Unmarshal(baseConfYaml)
	if err != nil {
		return nil, "", err
	}

	spew.Dump(conf)

	conf["extensions"] = map[string]interface{}{
		"zpages": map[string]interface{}{
			"endpoint": ta.ZPagesEndpoint,
		},
	}

	recommendedYaml, err := yaml.Parser().Marshal(conf)
	if err != nil {
		return nil, "", err
	}
	confId := ta.ZPagesEndpoint
	return recommendedYaml, confId, nil
}

func (ta *TestAgentConfProvider) ReportConfigDeploymentStatus(
	agentId string,
	configId string,
	status ConfigDeploymentStatus,
) {
	ta.reportedDeploymentStatuses[configId][agentId] = status
}

func (ta *TestAgentConfProvider) SubscribeToConfigUpdates(callback func()) func() {
	subscriberId := uuid.NewString()
	ta.Subscriptions[subscriberId] = callback

	return func() {
		delete(ta.Subscriptions, subscriberId)
	}
}

// Brought in from https://github.com/open-telemetry/opamp-go/blob/main/internal/testhelpers/nethelpers.go
func GetAvailableLocalAddress() string {
	ln, err := net.Listen("tcp", "127.0.0.1:")
	if err != nil {
		log.Fatalf("failed to get a free local port: %v", err)
	}
	// There is a possible race if something else takes this same port before
	// the test uses it, however, that is unlikely in practice.
	defer ln.Close()
	return ln.Addr().String()
}

type MockOpAmpConnection struct {
	ServerToAgentMsgs []*protobufs.ServerToAgent
}

func (conn *MockOpAmpConnection) Send(ctx context.Context, msg *protobufs.ServerToAgent) error {
	conn.ServerToAgentMsgs = append(conn.ServerToAgentMsgs, msg)
	return nil
}

// TODO(Raj): Maybe switch to clear all received messages.
func (conn *MockOpAmpConnection) latestMsgFromServer() *protobufs.ServerToAgent {
	if len(conn.ServerToAgentMsgs) < 1 {
		return nil
	}
	return conn.ServerToAgentMsgs[len(conn.ServerToAgentMsgs)-1]
}

func (conn *MockOpAmpConnection) Disconnect() error {
	return nil
}
func (conn *MockOpAmpConnection) RemoteAddr() net.Addr {
	return nil
}

// Returns recommended remote collector config yaml or ""
func RemoteConfigBody(msg *protobufs.ServerToAgent) string {
	collectorConfFiles := msg.RemoteConfig.Config.ConfigMap
	if len(collectorConfFiles) < 1 {
		return ""
	}
	return string(maps.Values(collectorConfFiles)[0].Body)
}

var TestCollectorConfig protobufs.AgentConfigMap = protobufs.AgentConfigMap{
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
