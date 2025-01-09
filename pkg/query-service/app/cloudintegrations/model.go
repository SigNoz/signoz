package cloudintegrations

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// Represents a cloud provider account for cloud integrations
type AccountRecord struct {
	CloudProvider   string         `json:"cloud_provider" db:"cloud_provider"`
	Id              string         `json:"id" db:"id"`
	Config          *AccountConfig `json:"config" db:"config_json"`
	CloudAccountId  *string        `json:"cloud_account_id" db:"cloud_account_id"`
	LastAgentReport *AgentReport   `json:"last_agent_report" db:"last_agent_report_json"`
	CreatedAt       time.Time      `json:"created_at" db:"created_at"`
	RemovedAt       *time.Time     `json:"removed_at" db:"removed_at"`
}

type AccountConfig struct {
	EnabledRegions []string `json:"regions"`
}

func DefaultAccountConfig() AccountConfig {
	return AccountConfig{
		EnabledRegions: []string{},
	}
}

// For serializing from db
func (c *AccountConfig) Scan(src any) error {
	data, ok := src.([]byte)
	if !ok {
		return fmt.Errorf("tried to scan from %T instead of bytes", src)
	}

	return json.Unmarshal(data, &c)
}

// For serializing to db
func (c *AccountConfig) Value() (driver.Value, error) {
	if c == nil {
		return nil, nil
	}

	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize cloud account config to JSON: %w", err,
		)
	}
	return serialized, nil
}

type AgentReport struct {
	TimestampMillis int64          `json:"timestamp_millis"`
	Data            map[string]any `json:"data"`
}

// For serializing from db
func (r *AgentReport) Scan(src any) error {
	data, ok := src.([]byte)
	if !ok {
		return fmt.Errorf("tried to scan from %T instead of bytes", src)
	}

	return json.Unmarshal(data, &r)
}

// For serializing to db
func (r *AgentReport) Value() (driver.Value, error) {
	if r == nil {
		return nil, nil
	}

	serialized, err := json.Marshal(r)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize agent report to JSON: %w", err,
		)
	}
	return serialized, nil
}

type AccountStatus struct {
	Integration AccountIntegrationStatus `json:"integration"`
}

type AccountIntegrationStatus struct {
	LastHeartbeatTsMillis *int64 `json:"last_heartbeat_ts_ms"`
}

func (a *AccountRecord) status() AccountStatus {
	status := AccountStatus{}
	if a.LastAgentReport != nil {
		lastHeartbeat := a.LastAgentReport.TimestampMillis
		status.Integration.LastHeartbeatTsMillis = &lastHeartbeat
	}
	return status
}

func (a *AccountRecord) account() Account {
	ca := Account{Id: a.Id, Status: a.status()}

	if a.CloudAccountId != nil {
		ca.CloudAccountId = *a.CloudAccountId
	}

	if a.Config != nil {
		ca.Config = *a.Config
	} else {
		ca.Config = DefaultAccountConfig()
	}

	return ca
}
