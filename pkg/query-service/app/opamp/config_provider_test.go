package opamp

import (
	"fmt"
	"testing"

	"github.com/knadh/koanf"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/rawbytes"
	_ "github.com/mattn/go-sqlite3"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"golang.org/x/exp/maps"
)

func TestOpAMPServerToAgentCommunicationWithConfigProvider(t *testing.T) {
	require := require.New(t)

	tb := newTestbed(t)

	require.Equal(
		0, len(tb.testConfigProvider.ConfigUpdateSubscribers),
		"there should be no agent config subscribers at the start",
	)
	tb.StartServer()
	require.Equal(
		1, len(tb.testConfigProvider.ConfigUpdateSubscribers),
		"Opamp server should have subscribed to updates from config provider after being started",
	)

	// Server should always respond with a RemoteConfig when an agent connects.
	// Even if there are no recommended changes to the agent's initial config
	require.False(tb.testConfigProvider.HasRecommendations())
	agent1Conn := &MockOpAmpConnection{}
	agent1Id := "testAgent1"
	tb.opampServer.OnMessage(
		agent1Conn,
		&protobufs.AgentToServer{
			InstanceUid: agent1Id,
			EffectiveConfig: &protobufs.EffectiveConfig{
				ConfigMap: initialAgentConf(),
			},
		},
	)
	lastAgent1Msg := agent1Conn.LatestMsgFromServer()
	require.NotNil(
		lastAgent1Msg,
		"Server should always send a remote config to the agent when it connects",
	)
	require.Equal(
		RemoteConfigBody(lastAgent1Msg),
		string(initialAgentConf().ConfigMap[model.CollectorConfigFilename].Body),
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
				ConfigMap: initialAgentConf(),
			},
		},
	)
	lastAgent2Msg := agent2Conn.LatestMsgFromServer()
	require.NotNil(
		lastAgent2Msg,
		"server should recommend a config to agent when it connects",
	)

	recommendedEndpoint, err := GetStringValueFromYaml(
		[]byte(RemoteConfigBody(lastAgent2Msg)), "extensions.zpages.endpoint",
	)
	require.Nil(err)
	require.Equal(
		tb.testConfigProvider.ZPagesEndpoint, recommendedEndpoint,
		"server should send recommended config to agent when it connects",
	)

	agent2Conn.ClearMsgsFromServer()
	tb.opampServer.OnMessage(agent2Conn, &protobufs.AgentToServer{
		InstanceUid: agent2Id,
		EffectiveConfig: &protobufs.EffectiveConfig{
			ConfigMap: NewAgentConfigMap(
				[]byte(RemoteConfigBody(lastAgent2Msg)),
			),
		},
		RemoteConfigStatus: &protobufs.RemoteConfigStatus{
			Status:               protobufs.RemoteConfigStatuses_RemoteConfigStatuses_APPLIED,
			LastRemoteConfigHash: lastAgent2Msg.RemoteConfig.ConfigHash,
		},
	})
	expectedConfId := tb.testConfigProvider.ZPagesEndpoint
	require.True(tb.testConfigProvider.HasReportedDeploymentStatus(expectedConfId, agent2Id),
		"Server should report deployment success to config provider on receiving update from agent.",
	)
	require.True(tb.testConfigProvider.ReportedDeploymentStatuses[expectedConfId][agent2Id])
	require.Nil(
		agent2Conn.LatestMsgFromServer(),
		"Server should not recommend a RemoteConfig if agent is already running it.",
	)

	// Server should rollout latest config to all agents when notified of a change by config provider
	agent1Conn.ClearMsgsFromServer()
	agent2Conn.ClearMsgsFromServer()
	tb.testConfigProvider.ZPagesEndpoint = "localhost:66666"
	tb.testConfigProvider.NotifySubscribersOfChange()
	for _, agentConn := range []*MockOpAmpConnection{agent1Conn, agent2Conn} {
		lastMsg := agentConn.LatestMsgFromServer()

		recommendedEndpoint, err := GetStringValueFromYaml(
			[]byte(RemoteConfigBody(lastMsg)), "extensions.zpages.endpoint",
		)
		require.Nil(err)
		require.Equal(tb.testConfigProvider.ZPagesEndpoint, recommendedEndpoint)
	}

	lastAgent2Msg = agent2Conn.LatestMsgFromServer()
	tb.opampServer.OnMessage(agent2Conn, &protobufs.AgentToServer{
		InstanceUid: agent2Id,
		RemoteConfigStatus: &protobufs.RemoteConfigStatus{
			Status:               protobufs.RemoteConfigStatuses_RemoteConfigStatuses_FAILED,
			LastRemoteConfigHash: lastAgent2Msg.RemoteConfig.ConfigHash,
		},
	})
	expectedConfId = tb.testConfigProvider.ZPagesEndpoint
	require.True(tb.testConfigProvider.HasReportedDeploymentStatus(expectedConfId, agent2Id),
		"Server should report deployment failure to config provider on receiving update from agent.",
	)
	require.False(tb.testConfigProvider.ReportedDeploymentStatuses[expectedConfId][agent2Id])

	lastAgent1Msg = agent1Conn.LatestMsgFromServer()
	agent1Conn.ClearMsgsFromServer()
	response := tb.opampServer.OnMessage(agent1Conn, &protobufs.AgentToServer{
		InstanceUid: agent1Id,
		RemoteConfigStatus: &protobufs.RemoteConfigStatus{
			Status:               protobufs.RemoteConfigStatuses_RemoteConfigStatuses_APPLIED,
			LastRemoteConfigHash: lastAgent1Msg.RemoteConfig.ConfigHash,
		},
	})
	require.Nil(response.RemoteConfig)
	require.Nil(
		agent1Conn.LatestMsgFromServer(),
		"server should not recommend a config if agent is reporting back with status on a broadcasted config",
	)

	require.Equal(1, len(tb.testConfigProvider.ConfigUpdateSubscribers))
	tb.opampServer.Stop()
	require.Equal(
		0, len(tb.testConfigProvider.ConfigUpdateSubscribers),
		"Opamp server should have unsubscribed to config provider updates after shutdown",
	)
}

type testbed struct {
	testConfigProvider *MockAgentConfigProvider
	opampServer        *Server
	t                  *testing.T
}

func newTestbed(t *testing.T) *testbed {
	testDB := utils.NewQueryServiceDBForTests(t)
	_, err := model.InitDB(testDB.SQLxDB())
	if err != nil {
		t.Fatalf("could not init opamp model: %v", err)
	}

	testConfigProvider := NewMockAgentConfigProvider()
	opampServer := InitializeServer(nil, testConfigProvider)

	return &testbed{
		testConfigProvider: testConfigProvider,
		opampServer:        opampServer,
		t:                  t,
	}
}

func (tb *testbed) StartServer() {
	testListenPath := GetAvailableLocalAddress()
	err := tb.opampServer.Start(testListenPath)
	require.Nil(tb.t, err, "should be able to start opamp server")
}

// Test helper
func GetStringValueFromYaml(
	serializedYaml []byte, path string,
) (string, error) {
	if len(serializedYaml) < 1 {
		return "", fmt.Errorf("yaml data is empty")
	}

	k := koanf.New(".")
	err := k.Load(rawbytes.Provider(serializedYaml), yaml.Parser())
	if err != nil {
		return "", errors.Wrap(err, "could not unmarshal collector config")
	}

	return k.String("extensions.zpages.endpoint"), nil
}

// Returns body of a ServerToAgent.RemoteConfig or ""
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

func NewAgentConfigMap(body []byte) *protobufs.AgentConfigMap {
	return &protobufs.AgentConfigMap{
		ConfigMap: map[string]*protobufs.AgentConfigFile{
			model.CollectorConfigFilename: {
				Body:        body,
				ContentType: "text/yaml",
			},
		},
	}

}

func initialAgentConf() *protobufs.AgentConfigMap {
	return NewAgentConfigMap(
		[]byte(`
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
	)
}
