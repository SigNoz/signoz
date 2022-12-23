package opamp

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server"
	"github.com/open-telemetry/opamp-go/server/types"
	"go.opentelemetry.io/collector/confmap"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
)

type Server struct {
	server server.OpAMPServer
	agents *model.Agents
}

func NewServer(agents *model.Agents) *Server {
	srv := &Server{
		agents: agents,
	}

	srv.server = server.New(&Logger{log.New(os.Stdout, "opamp: ", log.LstdFlags)})

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
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		for range ticker.C {
			agent := srv.agents.FindAgent(model.InstanceId("00000000000000000000000000"))
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
	}()
}

func (srv *Server) Stop() {
	srv.server.Stop(context.Background())
}

func (srv *Server) onDisconnect(conn types.Connection) {
	srv.agents.RemoveConnection(conn)
}

func (srv *Server) onMessage(conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
	instanceId := model.InstanceId(msg.InstanceUid)

	agent, err := srv.agents.FindOrCreateAgent(instanceId, conn)
	if err != nil {
		// Handle this
	}
	var response *protobufs.ServerToAgent
	response = &protobufs.ServerToAgent{}

	agent.UpdateStatus(msg, response)

	return response
}
