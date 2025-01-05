package cloudintegrations

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// Represents a cloud provider account for cloud integrations
type Account struct {
	Id              string        `json:"id" db:"id"`
	Config          AccountConfig `json:"config_json" db:"config_json"`
	CloudAccountId  string        `json:"cloud_account_id" db:"cloud_account_id"`
	LastAgentReport AgentReport   `json:"last_agent_report_json" db:"last_agent_report_json"`
	CreatedAt       time.Time     `json:"created_at" db:"created_at"`
	RemovedAt       time.Time     `json:"removed_at" db:"removed_at"`
}

type AccountConfig map[string]any

// For serializing from db
func (c *AccountConfig) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, &c)
	}
	return nil
}

// For serializing to db
func (c *AccountConfig) Value() (driver.Value, error) {
	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize cloud account config to JSON: %w", err,
		)
	}
	return serialized, nil
}

type AgentReport map[string]any

// For serializing from db
func (c *AgentReport) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, &c)
	}
	return nil
}

// For serializing to db
func (c *AgentReport) Value() (driver.Value, error) {
	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize cloud account config to JSON: %w", err,
		)
	}
	return serialized, nil
}
