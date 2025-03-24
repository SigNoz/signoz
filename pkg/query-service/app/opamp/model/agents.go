package model

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server/types"
	"github.com/pkg/errors"
	"github.com/uptrace/bun"
	signozTypes "go.signoz.io/signoz/pkg/types"
	"go.uber.org/zap"
)

var db *bun.DB

var AllAgents = Agents{
	agentsById:  map[string]*Agent{},
	connections: map[types.Connection]map[string]bool{},
}

type Agents struct {
	mux         sync.RWMutex
	agentsById  map[string]*Agent
	connections map[types.Connection]map[string]bool
}

func (a *Agents) Count() int {
	return len(a.connections)
}

// Initialize the database and create schema if needed
func InitDB(qsDB *bun.DB) (*bun.DB, error) {
	db = qsDB

	AllAgents = Agents{
		agentsById:  make(map[string]*Agent),
		connections: make(map[types.Connection]map[string]bool),
		mux:         sync.RWMutex{},
	}
	return db, nil
}

// RemoveConnection removes the connection all Agent instances associated with the
// connection.
func (agents *Agents) RemoveConnection(conn types.Connection) {
	agents.mux.Lock()
	defer agents.mux.Unlock()

	for instanceId := range agents.connections[conn] {
		agent := agents.agentsById[instanceId]
		agent.CurrentStatus = signozTypes.AgentStatusDisconnected
		agent.TerminatedAt = time.Now()
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

func (agents *Agents) getDefaultOrgID() (string, error) {
	var orgID []string
	err := db.NewSelect().Model((*signozTypes.Organization)(nil)).Column("id").Scan(context.Background(), &orgID)
	if err != nil {
		return "", err
	}

	if len(orgID) == 0 {
		return "", nil
	}

	if len(orgID) != 1 {
		return "", fmt.Errorf("expected exactly one organization, but found %d", len(orgID))
	}

	return orgID[0], nil
}

// FindOrCreateAgent returns the Agent instance associated with the given agentID.
// If the Agent instance does not exist, it is created and added to the list of
// Agent instances.
func (agents *Agents) FindOrCreateAgent(agentID string, conn types.Connection) (*Agent, bool, error) {
	agents.mux.Lock()
	defer agents.mux.Unlock()
	var created bool
	agent, ok := agents.agentsById[agentID]
	if !ok || agent == nil {
		orgID, err := agents.getDefaultOrgID()
		if err != nil {
			return nil, created, err
		}
		agent = New(orgID, agentID, conn)
		err = agent.Upsert()
		if err != nil {
			return nil, created, err
		}
		agents.agentsById[agentID] = agent

		if agents.connections[conn] == nil {
			agents.connections[conn] = map[string]bool{}
		}
		agents.connections[conn][agentID] = true
		created = true
	}
	return agent, created, nil
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
			[]byte(agent.EffectiveConfig),
		)
		if err != nil {
			return errors.Wrap(err, fmt.Sprintf(
				"could not generate conf recommendation for %v", agent.AgentID,
			))
		}

		// Recommendation is same as current config
		if string(newConfig) == agent.EffectiveConfig {
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

		ListenToConfigUpdate(agent.AgentID, confId, provider.ReportConfigDeploymentStatus)
	}
	return nil
}
