package data

import (
	"fmt"
	"sync"

	"github.com/jmoiron/sqlx"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server/types"
)

var db *sqlx.DB

func InitDB(dataSourceName string) (*sqlx.DB, error) {
	var err error

	db, err = sqlx.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, err
	}

	table_schema := `CREATE TABLE IF NOT EXISTS agents (
		instance_id INTEGER PRIMARY KEY UNIQUE,
		status TEXT NOT NULL,
		effective_config TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating agents table: %s", err.Error())
	}

	rows, err := db.Query("SELECT * FROM agents")
	if err != nil {
		return nil, fmt.Errorf("Error in querying agents table: %s", err.Error())
	}
	defer rows.Close()

	agents := &Agents{
		agentsById:  map[InstanceId]*Agent{},
		connections: map[types.Connection]map[InstanceId]bool{},
		mux:         sync.RWMutex{},
	}

	for rows.Next() {
		var agent Agent
		err = rows.Scan(&agent.Id, &agent.Status, &agent.EffectiveConfig)
		if err != nil {
			return nil, fmt.Errorf("Error in scanning agents table: %s", err.Error())
		}
		agents.agentsById[agent.Id] = &agent
	}

	AllAgents = *agents

	return db, nil
}

type Agents struct {
	mux         sync.RWMutex
	agentsById  map[InstanceId]*Agent
	connections map[types.Connection]map[InstanceId]bool
}

// RemoveConnection removes the connection all Agent instances associated with the
// connection.
func (agents *Agents) RemoveConnection(conn types.Connection) {
	agents.mux.Lock()
	defer agents.mux.Unlock()

	for instanceId := range agents.connections[conn] {
		delete(agents.agentsById, instanceId)
	}
	delete(agents.connections, conn)

	// TODO: remove agent from database?
}

func (agents *Agents) FindAgent(agentId InstanceId) *Agent {
	agents.mux.RLock()
	defer agents.mux.RUnlock()
	return agents.agentsById[agentId]
}

func (agents *Agents) FindOrCreateAgent(agentId InstanceId, conn types.Connection) *Agent {
	agents.mux.Lock()
	defer agents.mux.Unlock()

	// Ensure the Agent is in the agentsById map.
	agent := agents.agentsById[agentId]
	if agent == nil {
		agent = NewAgent(agentId, conn)
		agents.agentsById[agentId] = agent

		// Ensure the Agent's instance id is associated with the connection.
		if agents.connections[conn] == nil {
			agents.connections[conn] = map[InstanceId]bool{}
		}
		agents.connections[conn][agentId] = true
	}

	return agent
}

func (agents *Agents) UpdateAgent(agentId InstanceId, status *protobufs.AgentToServer, effectiveConfig string) error {
	agents.mux.Lock()
	defer agents.mux.Unlock()

	agent := agents.agentsById[agentId]
	if agent == nil {
		return fmt.Errorf("Agent with id %s not found", agentId)
	}

	agent.Status = status
	agent.EffectiveConfig = effectiveConfig

	_, err := db.Exec("UPDATE agents SET status = ?, effective_config = ? WHERE instance_id = ?", status, effectiveConfig, agentId)
	if err != nil {
		return fmt.Errorf("Error in updating agents table: %s", err.Error())
	}

	return nil
}

var AllAgents = Agents{
	agentsById:  map[InstanceId]*Agent{},
	connections: map[types.Connection]map[InstanceId]bool{},
}
