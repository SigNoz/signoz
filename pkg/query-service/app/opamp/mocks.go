package opamp

import (
	"context"
	"log"
	"net"

	"github.com/google/uuid"
	"github.com/knadh/koanf"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/rawbytes"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/pkg/errors"
)

type MockOpAmpConnection struct {
	ServerToAgentMsgs []*protobufs.ServerToAgent
}

func (conn *MockOpAmpConnection) Send(ctx context.Context, msg *protobufs.ServerToAgent) error {
	conn.ServerToAgentMsgs = append(conn.ServerToAgentMsgs, msg)
	return nil
}

func (conn *MockOpAmpConnection) LatestMsgFromServer() *protobufs.ServerToAgent {
	if len(conn.ServerToAgentMsgs) < 1 {
		return nil
	}
	return conn.ServerToAgentMsgs[len(conn.ServerToAgentMsgs)-1]
}

func (conn *MockOpAmpConnection) ClearMsgsFromServer() []*protobufs.ServerToAgent {
	msgs := conn.ServerToAgentMsgs
	conn.ServerToAgentMsgs = []*protobufs.ServerToAgent{}
	return msgs
}

func (conn *MockOpAmpConnection) Disconnect() error {
	return nil
}
func (conn *MockOpAmpConnection) RemoteAddr() net.Addr {
	return nil
}

// Implements opamp.AgentConfigProvider
type MockAgentConfigProvider struct {
	// An updated config is recommended by TestAgentConfProvider
	// if `ZPagesEndpoint` is not empty
	ZPagesEndpoint string

	ConfigUpdateSubscribers map[string]func()

	// { configId: { agentId: isOk } }
	ReportedDeploymentStatuses map[string]map[string]bool
}

func NewMockAgentConfigProvider() *MockAgentConfigProvider {
	return &MockAgentConfigProvider{
		ConfigUpdateSubscribers:    map[string]func(){},
		ReportedDeploymentStatuses: map[string]map[string]bool{},
	}
}

// Test helper.
func (ta *MockAgentConfigProvider) HasRecommendations() bool {
	return len(ta.ZPagesEndpoint) > 0
}

// AgentConfigProvider interface
func (ta *MockAgentConfigProvider) RecommendAgentConfig(baseConfYaml []byte) (
	[]byte, string, error,
) {
	if len(ta.ZPagesEndpoint) < 1 {
		return baseConfYaml, "agent-base-config", nil
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

// AgentConfigProvider interface
func (ta *MockAgentConfigProvider) ReportConfigDeploymentStatus(
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
func (ta *MockAgentConfigProvider) HasReportedDeploymentStatus(
	configId string, agentId string,
) bool {
	confIdReports := ta.ReportedDeploymentStatuses[configId]
	if confIdReports == nil {
		return false
	}
	_, exists := confIdReports[agentId]
	return exists
}

// AgentConfigProvider interface
func (ta *MockAgentConfigProvider) SubscribeToConfigUpdates(callback func()) func() {
	subscriberId := uuid.NewString()
	ta.ConfigUpdateSubscribers[subscriberId] = callback

	return func() {
		delete(ta.ConfigUpdateSubscribers, subscriberId)
	}
}

// test helper.
func (ta *MockAgentConfigProvider) NotifySubscribersOfChange() {
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
