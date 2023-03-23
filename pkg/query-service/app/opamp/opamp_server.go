package opamp

import (
	"context"

	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server"
	"github.com/open-telemetry/opamp-go/server/types"
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

func InitalizeServer(listener string, agents *model.Agents) error {

	if agents == nil {
		agents = &model.AllAgents
	}

	opAmpServer = &Server{
		agents: agents,
	}
	opAmpServer.server = server.New(zap.S())

	return opAmpServer.Start(listener)
}

func StopServer() {
	if opAmpServer != nil {
		opAmpServer.Stop()
	}
}

func (srv *Server) Start(listener string) error {
	settings := server.StartSettings{
		Settings: server.Settings{
			Callbacks: server.CallbacksStruct{
				OnMessageFunc:         srv.onMessage,
				OnConnectionCloseFunc: srv.onDisconnect,
			},
		},
		ListenEndpoint: listener,
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

	agent, created, err := srv.agents.FindOrCreateAgent(agentID, conn)
	if err != nil {
		zap.S().Error("Failed to find or create agent %q: %v", agentID, err)
		// TODO: handle error
	}

	if created {
		agent.CanLB = model.ExtractLbFlag(msg.AgentDescription)
		zap.S().Debugf("New agent added:", zap.Bool("canLb", agent.CanLB), zap.String("ID", agent.ID), zap.Any("status", agent.CurrentStatus))
	}

	var response *protobufs.ServerToAgent
	response = &protobufs.ServerToAgent{
		InstanceUid:  agentID,
		Capabilities: uint64(capabilities),
	}

	agent.UpdateStatus(msg, response)

	return response
}

// global var methods to support singleton pattern. we want to discourage
// allow multiple servers in one installation
func Ready() bool {
	if opAmpServer == nil {
		return false
	}
	if opAmpServer.agents.Count() == 0 {
		zap.S().Warnf("no agents available, all agent config requests will be rejected")
		return false
	}
	return true
}

func Subscribe(agentId string, hash string, f model.OnChangeCallback) {
	model.ListenToConfigUpdate(agentId, hash, f)
}
