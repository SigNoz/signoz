package opamp

import (
	"context"
	"crypto/sha256"
	"fmt"
	"math/rand"
	"time"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server"
	"github.com/open-telemetry/opamp-go/server/types"
	"go.opentelemetry.io/collector/confmap"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.uber.org/zap"
)

type Server struct {
	server       server.OpAMPServer
	agents       *model.Agents
	logger       *zap.Logger
	capabilities int32
}

const capabilities = protobufs.ServerCapabilities_ServerCapabilities_AcceptsEffectiveConfig |
	protobufs.ServerCapabilities_ServerCapabilities_OffersRemoteConfig |
	protobufs.ServerCapabilities_ServerCapabilities_AcceptsStatus

func NewServer(agents *model.Agents) *Server {
	srv := &Server{
		agents: agents,
	}

	srv.server = server.New(zap.S())
	return srv
}

func (srv *Server) Start() {
	settings := server.StartSettings{
		Settings: server.Settings{
			Callbacks: server.CallbacksStruct{
				OnMessageFunc:         srv.onMessage,
				OnConnectionCloseFunc: srv.onDisconnect,
			},
		},
		ListenEndpoint: "127.0.0.1:4320",
	}

	srv.server.Start(settings)
	// TODO: remove this
	go srv.dummy()
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

func (srv *Server) dummy() {
	ticker := time.NewTicker(60 * time.Second)
	for range ticker.C {
		agent := srv.agents.FindAgent("00000000000000000000000000")
		if agent == nil {
			continue
		}
		config := agent.EffectiveConfig
		c, err := yaml.Parser().Unmarshal([]byte(config))
		agentConf := confmap.NewFromStringMap(c)

		configs := []string{
			`
processors:
  batch:
    timeout: 2s
`,
			`processors:
   batch:
     timeout: 1s`,
		}

		// random choice between 2 configs
		config2 := configs[rand.Intn(len(configs))]
		c2, err := yaml.Parser().Unmarshal([]byte(config2))
		fmt.Println("config2 err", err)
		conf2 := confmap.NewFromStringMap(c2)

		err = agentConf.Merge(conf2)
		fmt.Println("merging", err)
		configR, err := yaml.Parser().Marshal(agentConf.ToStringMap())
		fmt.Println(conf2.ToStringMap())
		fmt.Println("sending new config", string(configR), err)
		// hash of configR
		hash := sha256.New()
		hash.Write(configR)
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
	}
}
