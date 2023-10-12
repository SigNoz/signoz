package opamp

import (
	"log"
	"net"
	"testing"

	"github.com/google/uuid"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/stretchr/testify/require"
)

func TestOpAMPServerToAgentCommunicationWithConfigProvider(t *testing.T) {
	require := require.New(t)

	// should be able to construct and start opamp server with config provider
	testZpagesEndpoint := "localhost:55555"
	testConfigProvider := &TestAgentConfProvider{
		ZPagesEndpoint: testZpagesEndpoint,
	}
	require.Equal(0, len(testConfigProvider.Subscriptions))

	server := InitializeServer(nil, testConfigProvider)
	testListenPath := GetAvailableLocalAddress()
	server.Start(testListenPath)

	// Opamp server should have subscribed to updates from config provider.
	require.Equal(1, len(testConfigProvider.Subscriptions))

	// The server should recommend provided config when the agent first connects.

	// The server should report deployment status to config provider

	// The server should rollout latest config to all agents when notified of
	// a change by config provider

	// The server should unsubscribe after shutdown

}

type TestAgentConfProvider struct {
	// This config provider recommends collector config
	// by adding the following zpages to supplied base config
	ZPagesEndpoint string

	Subscriptions map[string]func()

	// { configId: { agentId: status }}
	reportedDeploymentStatuses map[string]map[string]ConfigDeploymentStatus
}

func (ta *TestAgentConfProvider) RecommendAgentConfig(baseConfYaml []byte) (
	[]byte, string, error,
) {
	conf, err := yaml.Parser().Unmarshal(baseConfYaml)
	if err != nil {
		return nil, "", err
	}

	zPages := conf["extensions"].(map[string]interface{})["zpages"].(map[string]interface{})
	zPages["endpoint"] = ta.ZPagesEndpoint

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
