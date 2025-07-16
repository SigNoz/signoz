package opamp

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation"
	model "github.com/SigNoz/signoz/pkg/query-service/app/opamp/model"
	"github.com/SigNoz/signoz/pkg/valuer"
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
	agents *model.Agents,
	agentConfigProvider AgentConfigProvider,
	instrumentation instrumentation.Instrumentation,
) *Server {
	if agents == nil {
		agents = &model.AllAgents
	}

	opAmpServer = &Server{
		agents:              agents,
		agentConfigProvider: agentConfigProvider,
	}
	opAmpServer.server = server.New(wrappedLogger(instrumentation.Logger()))
	return opAmpServer
}

func (srv *Server) Start(listener string) error {
	settings := server.StartSettings{
		Settings: server.Settings{
			Callbacks: types.Callbacks{
				OnConnecting: func(request *http.Request) types.ConnectionResponse {
					return types.ConnectionResponse{
						Accept: true,
						ConnectionCallbacks: types.ConnectionCallbacks{
							OnMessage:         srv.OnMessage,
							OnConnectionClose: srv.onDisconnect,
						},
					}
				},
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
// note :- there can only be 50 agents in the db for a given orgID, we don't have a check in-memory but we delete from the db after insert.
func (srv *Server) OnMessage(ctx context.Context, conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
	agentID, _ := valuer.NewUUIDFromBytes(msg.GetInstanceUid())

	// find the orgID, if nothing is found keep it empty.
	// the find or create agent will return an error if orgID is empty
	// thus retry will happen
	var orgID valuer.UUID
	orgIDs, err := srv.agents.OrgGetter.ListByOwnedKeyRange(context.Background())
	if err == nil && len(orgIDs) == 1 {
		orgID = orgIDs[0].ID
	}

	// when a new org is created and the agent is not able to register
	// the changes in pkg/query-service/app/opamp/model/agent.go 270 - 277 takes care that
	// agents sends the effective config when we processStatusUpdate.
	agent, created, err := srv.agents.FindOrCreateAgent(agentID.String(), conn, orgID)
	if err != nil {
		zap.L().Error("Failed to find or create agent", zap.String("agentID", agentID.String()), zap.Error(err))

		// Return error response according to OpAMP protocol
		return &protobufs.ServerToAgent{
			InstanceUid: msg.GetInstanceUid(),
			ErrorResponse: &protobufs.ServerErrorResponse{
				Type: protobufs.ServerErrorResponseType_ServerErrorResponseType_Unavailable,
				Details: &protobufs.ServerErrorResponse_RetryInfo{
					RetryInfo: &protobufs.RetryInfo{
						RetryAfterNanoseconds: uint64(5 * time.Second), // minimum recommended retry interval
					},
				},
			},
			// Note: refer to opamp/model/agent.go; look for `Flags` keyword
			// Flags: uint64(protobufs.ServerToAgentFlags_ServerToAgentFlags_ReportFullState),
		}
	}

	if created {
		agent.CanLB = model.ExtractLbFlag(msg.AgentDescription)
		zap.L().Debug(
			"New agent added", zap.Bool("canLb", agent.CanLB),
			zap.String("agentID", agent.AgentID),
			zap.Any("status", agent.Status),
		)
	}

	response := &protobufs.ServerToAgent{
		InstanceUid:  msg.GetInstanceUid(),
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

func Subscribe(orgId valuer.UUID, agentId string, hash string, f model.OnChangeCallback) {
	model.ListenToConfigUpdate(orgId, agentId, hash, f)
}
