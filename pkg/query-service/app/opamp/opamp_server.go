package opamp

import (
	"context"
	"log"
	"os"

	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server"
	"github.com/open-telemetry/opamp-go/server/types"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
)

type Server struct {
	server server.OpAMPServer
	agents *model.Agents
	cnt    int
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
}

func (srv *Server) Stop() {
	srv.server.Stop(context.Background())
}

func (srv *Server) onDisconnect(conn types.Connection) {
	srv.agents.RemoveConnection(conn)
}

func (srv *Server) onMessage(conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
	instanceId := model.InstanceId(msg.InstanceUid)

	agent := srv.agents.FindOrCreateAgent(instanceId, conn)

	// FIXME: This is a hack to get the agent to send the initial config
	f, err := os.ReadFile("./server/config.yaml")
	if err != nil {
		panic(err)
	}
	var response *protobufs.ServerToAgent
	response = &protobufs.ServerToAgent{}
	if srv.cnt <= 2 {

		// Start building the response.
		response = &protobufs.ServerToAgent{
			RemoteConfig: &protobufs.AgentRemoteConfig{
				Config: &protobufs.AgentConfigMap{
					ConfigMap: map[string]*protobufs.AgentConfigFile{
						"collector.yaml": {
							Body: f,
						},
					},
				},
				ConfigHash: []byte("123"),
			},
		}
		srv.cnt++
	}
	// Update the agent's status.

	agent.UpdateStatus(msg, response)

	return response
}
