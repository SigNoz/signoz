package opamp

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/knadh/koanf"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/rawbytes"
	_ "github.com/mattn/go-sqlite3"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"golang.org/x/exp/maps"
)

func TestOpAMPServerToAgentCommunicationWithConfigProvider(t *testing.T) {
	require := require.New(t)

	tb := NewTestBed(t)

	require.Equal(
		0, len(tb.testConfigProvider.ConfigUpdateSubscribers),
		"there should be no agent config subscribers at the start",
	)
	tb.StartServer()
	require.Equal(
		1, len(tb.testConfigProvider.ConfigUpdateSubscribers),
		"Opamp server should have subscribed to updates from config provider after being started",
	)

	require.False(tb.testConfigProvider.HasRecommendations())
	agent1Conn := &MockOpAmpConnection{}
	agent1Id := "testAgent1"
	tb.opampServer.OnMessage(
		agent1Conn,
		&protobufs.AgentToServer{
			InstanceUid: agent1Id,
			EffectiveConfig: &protobufs.EffectiveConfig{
				ConfigMap: &TestCollectorConfig,
			},
		},
	)
	require.Nil(
		agent1Conn.latestMsgFromServer(),
		"Server should not recommend any config to the agent if the provider recommends agent's current config",
	)

	tb.testConfigProvider.ZPagesEndpoint = "localhost:55555"
	require.True(tb.testConfigProvider.HasRecommendations())
	agent2Id := "testAgent2"
	agent2Conn := &MockOpAmpConnection{}
	tb.opampServer.OnMessage(
		agent2Conn,
		&protobufs.AgentToServer{
			InstanceUid: agent2Id,
			EffectiveConfig: &protobufs.EffectiveConfig{
				ConfigMap: &TestCollectorConfig,
			},
		},
	)
	lastAgent2Msg := agent2Conn.latestMsgFromServer()
	require.NotNil(
		lastAgent2Msg,
		"server should recommend a config to agent on first connection if it has recommendations",
	)
	configRecommendedToAgent2 := RemoteConfigBody(lastAgent2Msg)
	tb.testConfigProvider.ValidateCollectorConfHasRecommendedZPagesEndpoint(
		t, []byte(configRecommendedToAgent2),
	)

	// Server should report deployment success to config provider on receiving update from agent.
	tb.opampServer.OnMessage(agent2Conn, &protobufs.AgentToServer{
		InstanceUid: agent2Id,
		EffectiveConfig: &protobufs.EffectiveConfig{
			ConfigMap: lastAgent2Msg.RemoteConfig.Config,
		},
		RemoteConfigStatus: &protobufs.RemoteConfigStatus{
			Status:               protobufs.RemoteConfigStatuses_RemoteConfigStatuses_APPLIED,
			LastRemoteConfigHash: lastAgent2Msg.RemoteConfig.ConfigHash,
		},
	})
	tb.testConfigProvider.ValidateConfigDeploymentStatus(
		t, agent2Id, tb.testConfigProvider.ZPagesEndpoint, true,
	)

	// Server should rollout latest config to all agents when notified of a change by config provider
	tb.testConfigProvider.ZPagesEndpoint = "localhost:66666"
	tb.testConfigProvider.NotifySubscribersOfChange()
	for _, agentConn := range []*MockOpAmpConnection{agent1Conn, agent2Conn} {
		lastMsg := agentConn.latestMsgFromServer()
		recommendedConfig := RemoteConfigBody(lastMsg)

		tb.testConfigProvider.ValidateCollectorConfHasRecommendedZPagesEndpoint(
			t, []byte(recommendedConfig),
		)
	}

	// Server should report deployment failure to config provider on receiving update from agent
	lastAgent2Msg = agent2Conn.latestMsgFromServer()
	tb.opampServer.OnMessage(agent2Conn, &protobufs.AgentToServer{
		InstanceUid: agent2Id,
		EffectiveConfig: &protobufs.EffectiveConfig{
			ConfigMap: lastAgent2Msg.RemoteConfig.Config,
		},
		RemoteConfigStatus: &protobufs.RemoteConfigStatus{
			Status:               protobufs.RemoteConfigStatuses_RemoteConfigStatuses_FAILED,
			LastRemoteConfigHash: lastAgent2Msg.RemoteConfig.ConfigHash,
		},
	})
	tb.testConfigProvider.ValidateConfigDeploymentStatus(
		t, agent2Id, tb.testConfigProvider.ZPagesEndpoint, false,
	)

	// Server should unsubscribe from config provider updates after shutdown
	require.Equal(1, len(tb.testConfigProvider.ConfigUpdateSubscribers))
	tb.opampServer.Stop()
	require.Equal(
		0, len(tb.testConfigProvider.ConfigUpdateSubscribers),
		"Opamp server should have unsubscribed to config provider updates after shutdown",
	)
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
		ConfigUpdateSubscribers:    map[string]func(){},
		ReportedDeploymentStatuses: map[string]map[string]bool{},
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
	// An updated config is recommended by TestAgentConfProvider
	// if `ZPagesEndpoint` is not empty
	ZPagesEndpoint string

	ConfigUpdateSubscribers map[string]func()

	// { configId: { agentId: isOk } }
	ReportedDeploymentStatuses map[string]map[string]bool
}

// Test helper.
func (ta *TestAgentConfProvider) HasRecommendations() bool {
	return len(ta.ZPagesEndpoint) > 0
}

// AgentConfigProvider interface
func (ta *TestAgentConfProvider) RecommendAgentConfig(baseConfYaml []byte) (
	[]byte, string, error,
) {
	if len(ta.ZPagesEndpoint) < 1 {
		return baseConfYaml, "", nil
	}

	k := koanf.New(".")
	err := k.Load(rawbytes.Provider(baseConfYaml), yaml.Parser())
	if err != nil {
		return nil, "", errors.Wrap(err, "could not unmarshal baseConf")
	}

	k.Set("extensions.zpages.endpoint", ta.ZPagesEndpoint)
	recommendedYaml, err := k.Marshal(yaml.Parser())
	if err != nil {
		return nil, "", errors.Wrap(err, "could not marshal recommended conf")
	}

	confId := ta.ZPagesEndpoint
	return recommendedYaml, confId, nil
}

// Test helper
func (tp *TestAgentConfProvider) ValidateCollectorConfHasRecommendedZPagesEndpoint(
	t *testing.T,
	collectorConf []byte,
) {
	require.NotEmpty(
		t, collectorConf, "config expected to contain zpages endpoint is empty",
	)

	k := koanf.New(".")
	err := k.Load(rawbytes.Provider(collectorConf), yaml.Parser())
	require.Nil(t, err, "could not unmarshal collector config")

	endpointInConf := k.String("extensions.zpages.endpoint")
	expectedEndpoint := tp.ZPagesEndpoint
	require.Equal(
		t, expectedEndpoint, endpointInConf,
		fmt.Sprintf(
			"zpages endpoint is not '%s' as expected, in %s",
			expectedEndpoint, collectorConf,
		),
	)
}

// AgentConfigProvider interface
func (ta *TestAgentConfProvider) ReportConfigDeploymentStatus(
	agentId string,
	configId string,
	err error,
) {
	confIdReports := ta.ReportedDeploymentStatuses[configId]
	if confIdReports == nil {
		confIdReports = map[string]bool{}
		ta.ReportedDeploymentStatuses[configId] = confIdReports
	}

	confIdReports[agentId] = (err == nil)
}

// Test helper.
func (ta *TestAgentConfProvider) ValidateConfigDeploymentStatus(
	t *testing.T, agentId string, configId string, expectOk bool,
) {
	assertionMsg := fmt.Sprintf(
		"config deployment status should be isOk: %v for conf: %s and agent: %s",
		expectOk, configId, agentId,
	)
	confIdReports := ta.ReportedDeploymentStatuses[configId]
	require.NotNil(t, confIdReports, assertionMsg)

	agentDeploymentIsOk := confIdReports[agentId]
	require.NotNil(t, agentDeploymentIsOk, assertionMsg)

	require.Equal(t, agentDeploymentIsOk, expectOk, assertionMsg)
}

// AgentConfigProvider interface
func (ta *TestAgentConfProvider) SubscribeToConfigUpdates(callback func()) func() {
	subscriberId := uuid.NewString()
	ta.ConfigUpdateSubscribers[subscriberId] = callback

	return func() {
		delete(ta.ConfigUpdateSubscribers, subscriberId)
	}
}

// test helper.
func (ta *TestAgentConfProvider) NotifySubscribersOfChange() {
	for _, callback := range ta.ConfigUpdateSubscribers {
		callback()
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

// Returns body a ServerToAgent.RemoteConfig or ""
func RemoteConfigBody(msg *protobufs.ServerToAgent) string {
	if msg == nil {
		return ""
	}

	collectorConfFiles := msg.RemoteConfig.Config.ConfigMap
	if len(collectorConfFiles) < 1 {
		return ""
	}
	return string(maps.Values(collectorConfFiles)[0].Body)
}

var TestCollectorConfig protobufs.AgentConfigMap = protobufs.AgentConfigMap{
	ConfigMap: map[string]*protobufs.AgentConfigFile{
		model.CollectorConfigFilename: {
			Body: []byte(`
      receivers:
        otlp:
      processors:
        batch:
      exporters:
        otlp:
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

type MockOpAmpConnection struct {
	ServerToAgentMsgs []*protobufs.ServerToAgent
}

func (conn *MockOpAmpConnection) Send(ctx context.Context, msg *protobufs.ServerToAgent) error {
	conn.ServerToAgentMsgs = append(conn.ServerToAgentMsgs, msg)
	return nil
}

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
