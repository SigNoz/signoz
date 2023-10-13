package opamp

import (
	"fmt"
	"log"
	"net"
	"os"
	"testing"

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
		agent1Conn.LatestMsgFromServer(),
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
	lastAgent2Msg := agent2Conn.LatestMsgFromServer()
	require.NotNil(
		lastAgent2Msg,
		"server should recommend a config to agent on first connection if it has recommendations",
	)

	recommendedEndpoint, err := GetCollectorConfStringValue(
		[]byte(RemoteConfigBody(lastAgent2Msg)), "extensions.zpages.endpoint",
	)
	require.Nil(err)
	require.Equal(
		tb.testConfigProvider.ZPagesEndpoint, recommendedEndpoint,
		"server should recommend a config to agent on first connection if it has recommendations",
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
	expectedConfId := tb.testConfigProvider.ZPagesEndpoint
	require.True(tb.testConfigProvider.HasReportedDeploymentStatus(
		agent2Id, expectedConfId,
	))
	require.True(tb.testConfigProvider.ReportedDeploymentStatuses[expectedConfId][agent2Id])

	// Server should rollout latest config to all agents when notified of a change by config provider
	tb.testConfigProvider.ZPagesEndpoint = "localhost:66666"
	tb.testConfigProvider.NotifySubscribersOfChange()
	for _, agentConn := range []*MockOpAmpConnection{agent1Conn, agent2Conn} {
		lastMsg := agentConn.LatestMsgFromServer()

		recommendedEndpoint, err := GetCollectorConfStringValue(
			[]byte(RemoteConfigBody(lastMsg)), "extensions.zpages.endpoint",
		)
		require.Nil(err)
		require.Equal(tb.testConfigProvider.ZPagesEndpoint, recommendedEndpoint)
	}

	// Server should report deployment failure to config provider on receiving update from agent
	lastAgent2Msg = agent2Conn.LatestMsgFromServer()
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
	expectedConfId = tb.testConfigProvider.ZPagesEndpoint
	require.True(tb.testConfigProvider.HasReportedDeploymentStatus(
		agent2Id, expectedConfId,
	))
	require.False(tb.testConfigProvider.ReportedDeploymentStatuses[expectedConfId][agent2Id])

	// Server should unsubscribe from config provider updates after shutdown
	require.Equal(1, len(tb.testConfigProvider.ConfigUpdateSubscribers))
	tb.opampServer.Stop()
	require.Equal(
		0, len(tb.testConfigProvider.ConfigUpdateSubscribers),
		"Opamp server should have unsubscribed to config provider updates after shutdown",
	)
}

type TestBed struct {
	testConfigProvider *MockAgentConfigProvider
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

	testConfigProvider := NewMockAgentConfigProvider()
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

// Test helper
func GetCollectorConfStringValue(
	collectorConf []byte, path string,
) (string, error) {
	if len(collectorConf) < 1 {
		return "", fmt.Errorf("collector conf is empty")
	}

	k := koanf.New(".")
	err := k.Load(rawbytes.Provider(collectorConf), yaml.Parser())
	if err != nil {
		return "", errors.Wrap(err, "could not unmarshal collector config")
	}

	return k.String("extensions.zpages.endpoint"), nil
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
