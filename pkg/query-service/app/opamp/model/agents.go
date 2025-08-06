package model

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server/types"
	"github.com/pkg/errors"
	"go.uber.org/zap"
)

var AllAgents = Agents{
	agentsById:  map[string]*Agent{},
	connections: map[types.Connection]map[string]bool{},
}

type Agents struct {
	mux         sync.RWMutex
	agentsById  map[string]*Agent
	connections map[types.Connection]map[string]bool
	store       sqlstore.SQLStore
	OrgGetter   organization.Getter
	logger      *slog.Logger
}

func (a *Agents) Count() int {
	return len(a.connections)
}

// Initialize the database and create schema if needed
func Init(sqlStore sqlstore.SQLStore, logger *slog.Logger, orgGetter organization.Getter) {

	AllAgents = Agents{
		agentsById:  make(map[string]*Agent),
		connections: make(map[types.Connection]map[string]bool),
		mux:         sync.RWMutex{},
		store:       sqlStore,
		OrgGetter:   orgGetter,
		logger:      logger,
	}
}

// RemoveConnection removes the connection all Agent instances associated with the
// connection.
func (agents *Agents) RemoveConnection(conn types.Connection) {
	agents.mux.Lock()
	defer agents.mux.Unlock()

	for instanceId := range agents.connections[conn] {
		agent := agents.agentsById[instanceId]
		agent.StorableAgent.Status = opamptypes.AgentStatusDisconnected
		agent.StorableAgent.TerminatedAt = time.Now()
		_ = agent.Upsert()
		delete(agents.agentsById, instanceId)
	}
	delete(agents.connections, conn)
}

// FindAgent returns the Agent instance associated with the given agentID.
func (agents *Agents) FindAgent(agentID string) *Agent {
	agents.mux.RLock()
	defer agents.mux.RUnlock()
	return agents.agentsById[agentID]
}

// FindOrCreateAgent returns the Agent instance associated with the given agentID.
// If the Agent instance does not exist, it is created and added to the list of
// Agent instances.
func (agents *Agents) FindOrCreateAgent(agentID string, conn types.Connection, orgID valuer.UUID) (*Agent, bool, error) {
	if agentID == "" {
		return nil, false, errors.New("cannot create agent without agentID")
	}

	agents.mux.Lock()
	defer agents.mux.Unlock()
	agent, ok := agents.agentsById[agentID]

	if ok && agent != nil {
		return agent, false, nil
	}

	if !ok && orgID.IsZero() {
		return nil, false, errors.New("cannot create agent without orgId")
	}

	agent = New(agents.store, agents.logger, orgID, agentID, conn)
	err := agent.Upsert()
	if err != nil {
		return nil, false, err
	}
	agent.KeepOnlyLast50Agents(context.Background())
	agents.agentsById[agentID] = agent

	if agents.connections[conn] == nil {
		agents.connections[conn] = map[string]bool{}
	}
	agents.connections[conn][agentID] = true
	return agent, true, nil
}

func (agents *Agents) GetAllAgents() []*Agent {
	agents.mux.RLock()
	defer agents.mux.RUnlock()

	allAgents := []*Agent{}
	for _, v := range agents.agentsById {
		allAgents = append(allAgents, v)
	}
	return allAgents
}

// Recommend latest config to connected agents whose effective
// config is not the same as the latest recommendation
func (agents *Agents) RecommendLatestConfigToAll(
	provider AgentConfigProvider,
) error {
	for _, agent := range agents.GetAllAgents() {
		newConfig, confId, err := provider.RecommendAgentConfig(
			agent.OrgID,
			[]byte(agent.Config),
		)
		if err != nil {
			return errors.Wrap(err, fmt.Sprintf(
				"could not generate conf recommendation for %v", agent.AgentID,
			))
		}

		// Recommendation is same as current config
		if string(newConfig) == agent.Config {
			zap.L().Info(
				"Recommended config same as current effective config for agent", zap.String("agentID", agent.AgentID),
			)
			return nil
		}

		newRemoteConfig := &protobufs.AgentRemoteConfig{
			Config: &protobufs.AgentConfigMap{
				ConfigMap: map[string]*protobufs.AgentConfigFile{
					CollectorConfigFilename: {
						Body:        newConfig,
						ContentType: "application/x-yaml",
					},
				},
			},
			ConfigHash: []byte(confId),
		}

		agent.mux.Lock()
		defer agent.mux.Unlock()
		agent.remoteConfig = newRemoteConfig

		agent.SendToAgent(&protobufs.ServerToAgent{
			RemoteConfig: newRemoteConfig,
		})

		ListenToConfigUpdate(agent.OrgID, agent.AgentID, confId, provider.ReportConfigDeploymentStatus)
	}
	return nil
}
