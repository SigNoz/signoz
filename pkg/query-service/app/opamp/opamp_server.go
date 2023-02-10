package opamp

import (
	"context"
	"crypto/sha256"
	"fmt"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server"
	"github.com/open-telemetry/opamp-go/server/types"
	"go.opentelemetry.io/collector/confmap"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.uber.org/zap"
)

var opAmpServer *Server

type Server struct {
	server       server.OpAMPServer
	agents       *model.Agents
	logger       *zap.Logger
	capabilities int32
}

const capabilities = protobufs.ServerCapabilities_ServerCapabilities_AcceptsEffectiveConfig |
	protobufs.ServerCapabilities_ServerCapabilities_OffersRemoteConfig |
	protobufs.ServerCapabilities_ServerCapabilities_AcceptsStatus

func InitalizeServer(agents *model.Agents) error {
	opAmpServer = &Server{
		agents: agents,
	}
	opAmpServer.server = server.New(zap.S())
	return opAmpServer.Start()
}

func (srv *Server) Start() error {
	settings := server.StartSettings{
		Settings: server.Settings{
			Callbacks: server.CallbacksStruct{
				OnMessageFunc:         srv.onMessage,
				OnConnectionCloseFunc: srv.onDisconnect,
			},
		},
		ListenEndpoint: "127.0.0.1:4320",
	}

	return srv.server.Start(settings)
}

func (srv *Server) Stop() {
	srv.server.Stop(context.Background())
}

func (srv *Server) onDisconnect(conn types.Connection) {
	srv.agents.RemoveConnection(conn)
}

func (srv *Server) onMessage(conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
	agentID := msg.InstanceUid

	agent, err := srv.agents.FindOrCreateAgent(agentID, conn)
	if err != nil {
		zap.S().Errorf("Failed to find or create agent %q: %v", agentID, err)
		// TODO: handle error
	}
	var response *protobufs.ServerToAgent
	response = &protobufs.ServerToAgent{
		InstanceUid:  agentID,
		Capabilities: uint64(capabilities),
	}

	agent.UpdateStatus(msg, response)

	return response
}

func UpsertProcessor(ctx context.Context, processors map[string]interface{}) error {

	x := map[string]interface{}{
		"processors": processors,
	}
	agent := opAmpServer.agents.FindAgent("00000000000000000000000000")
	if agent == nil {
		return fmt.Errorf("agent not found")
	}
	config := agent.EffectiveConfig
	c, err := yaml.Parser().Unmarshal([]byte(config))
	if err != nil {
		return err
	}
	agentConf := confmap.NewFromStringMap(c)

	conf2 := confmap.NewFromStringMap(x)

	err = agentConf.Merge(conf2)
	if err != nil {
		return err
	}
	configR, err := yaml.Parser().Marshal(agentConf.ToStringMap())
	if err != nil {
		return err
	}

	fmt.Println("sending new config", string(configR))
	hash := sha256.New()
	hash.Write(configR)

	agent.EffectiveConfig = string(configR)
	agent.Upsert()
	agent.SendToAgent(&protobufs.ServerToAgent{
		RemoteConfig: &protobufs.AgentRemoteConfig{
			Config: &protobufs.AgentConfigMap{
				ConfigMap: map[string]*protobufs.AgentConfigFile{
					"collector.yaml": {
						Body:        configR,
						ContentType: "application/x-yaml",
					},
				},
			},
			ConfigHash: hash.Sum(nil),
		},
	})
	return nil
}
