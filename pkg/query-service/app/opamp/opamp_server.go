package opamp

import (
	"context"
	"time"

	model "github.com/SigNoz/signoz/pkg/query-service/app/opamp/model"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server"
	"github.com/open-telemetry/opamp-go/server/types"

	"go.uber.org/zap"
)

var opAmpServer *Server

type Server struct {
	server server.OpAMPServer
	agents *model.Agents

	agentConfigProvider AgentConfigProvider

	// cleanups to be run when stopping the server
	cleanups []func()
}

const capabilities = protobufs.ServerCapabilities_ServerCapabilities_AcceptsEffectiveConfig |
	protobufs.ServerCapabilities_ServerCapabilities_OffersRemoteConfig |
	protobufs.ServerCapabilities_ServerCapabilities_AcceptsStatus

func InitializeServer(
	agents *model.Agents, agentConfigProvider AgentConfigProvider,
) *Server {
	if agents == nil {
		agents = &model.AllAgents
	}

	opAmpServer = &Server{
		agents:              agents,
		agentConfigProvider: agentConfigProvider,
	}
	opAmpServer.server = server.New(zap.L().Sugar())
	return opAmpServer
}

func (srv *Server) Start(listener string) error {
	settings := server.StartSettings{
		Settings: server.Settings{
			Callbacks: server.CallbacksStruct{
				OnMessageFunc:         srv.OnMessage,
				OnConnectionCloseFunc: srv.onDisconnect,
			},
		},
		ListenEndpoint: listener,
	}

	// This will have to send request to all the agents of all tenants
	unsubscribe := srv.agentConfigProvider.SubscribeToConfigUpdates(func() {
		err := srv.agents.RecommendLatestConfigToAll(srv.agentConfigProvider)
		if err != nil {
			zap.L().Error(
				"could not roll out latest config recommendation to connected agents", zap.Error(err),
			)
		}
	})
	srv.cleanups = append(srv.cleanups, unsubscribe)

	return srv.server.Start(settings)
}

func (srv *Server) Stop() {
	for _, cleanup := range srv.cleanups {
		defer cleanup()
	}

	_ = srv.server.Stop(context.Background())
}

func (srv *Server) onDisconnect(conn types.Connection) {
	srv.agents.RemoveConnection(conn)
}

// When the agent sends the message for the first time, then we need to know the orgID
// For the subsequent requests, agents don't send the attributes unless something is changed
// but we keep them in context mapped which is mapped to the instanceID, so we would know the
// orgID from the context
func (srv *Server) OnMessage(conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
	agentID := msg.InstanceUid

	var orgId string
	if msg.AgentDescription != nil && msg.AgentDescription.IdentifyingAttributes != nil {
		for _, attr := range msg.AgentDescription.IdentifyingAttributes {
			if attr.Key == "orgId" {
				orgId = attr.Value.GetStringValue()
				break
			}
		}
	}

	agent, created, err := srv.agents.FindOrCreateAgent(agentID, conn, orgId)
	if err != nil {
		zap.L().Error("Failed to find or create agent", zap.String("agentID", agentID), zap.Error(err))

		// Return error response according to OpAMP protocol
		return &protobufs.ServerToAgent{
			InstanceUid: agentID,
			ErrorResponse: &protobufs.ServerErrorResponse{
				Type: protobufs.ServerErrorResponseType_ServerErrorResponseType_Unavailable,
				Details: &protobufs.ServerErrorResponse_RetryInfo{
					RetryInfo: &protobufs.RetryInfo{
						RetryAfterNanoseconds: uint64(5 * time.Second), // minimum recommended retry interval
					},
				},
			},
		}
	}

	if created {
		agent.CanLB = model.ExtractLbFlag(msg.AgentDescription)
		zap.L().Debug(
			"New agent added", zap.Bool("canLb", agent.CanLB),
			zap.String("ID", agent.ID.StringValue()),
			zap.Any("status", agent.CurrentStatus),
		)
	}

	response := &protobufs.ServerToAgent{
		InstanceUid:  agentID,
		Capabilities: uint64(capabilities),
	}

	agent.UpdateStatus(msg, response, srv.agentConfigProvider)

	return response
}

// global var methods to support singleton pattern. we want to discourage
// allow multiple servers in one installation
func Ready() bool {
	if opAmpServer == nil {
		return false
	}
	if opAmpServer.agents.Count() == 0 {
		zap.L().Warn("no agents available, all agent config requests will be rejected")
		return false
	}
	return true
}

func Subscribe(agentId string, hash string, f model.OnChangeCallback) {
	model.ListenToConfigUpdate(agentId, hash, f)
}
