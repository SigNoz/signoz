package model

import (
	"fmt"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/open-telemetry/opamp-go/server/types"
)

var db *sqlx.DB

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

// InitDB initializes the database and creates the agents table.
func InitDB(dataSourceName string) (*sqlx.DB, error) {
	var err error

	db, err = sqlx.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, err
	}

	tableSchema := `CREATE TABLE IF NOT EXISTS agents (
		agent_id TEXT PRIMARY KEY UNIQUE,
		started_at datetime NOT NULL,
		terminated_at datetime,
		current_status TEXT NOT NULL,
		effective_config TEXT NOT NULL
	);`

	_, err = db.Exec(tableSchema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating agents table: %s", err.Error())
	}

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
		agent.CurrentStatus = AgentStatusDisconnected
		agent.TerminatedAt = time.Now()
		agent.Upsert()
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
func (agents *Agents) FindOrCreateAgent(agentID string, conn types.Connection) (*Agent, bool, error) {
	agents.mux.Lock()
	defer agents.mux.Unlock()
	var created bool
	agent, ok := agents.agentsById[agentID]
	var err error
	if !ok || agent == nil {
		agent = New(agentID, conn)
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
