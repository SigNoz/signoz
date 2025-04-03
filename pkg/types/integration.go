package types

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/pkg/errors"
	"github.com/uptrace/bun"
)

// --------------------------------------------------------------------------
// Normal integration uses just the installed_integration table
// --------------------------------------------------------------------------

type InstalledIntegration struct {
	bun.BaseModel `bun:"table:installed_integration"`

	Identifiable
	Type        string                     `json:"type" bun:"type,type:text,unique:org_id_type"`
	ConfigJSON  InstalledIntegrationConfig `json:"config_json" bun:"config_json,type:text"`
	InstalledAt time.Time                  `json:"installed_at" bun:"installed_at,default:current_timestamp"`
	OrgID       string                     `json:"org_id" bun:"org_id,type:text,unique:org_id_type,references:organizations(id),on_delete:cascade"`
}

type InstalledIntegrationConfig map[string]interface{}

// For serializing from db
func (c *InstalledIntegrationConfig) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, &c)
	}
	return nil
}

// For serializing to db
func (c *InstalledIntegrationConfig) Value() (driver.Value, error) {
	filterSetJson, err := json.Marshal(c)
	if err != nil {
		return nil, errors.Wrap(err, "could not serialize integration config to JSON")
	}
	return filterSetJson, nil
}

// --------------------------------------------------------------------------
// Cloud integration uses the cloud_integration table
// and cloud_integrations_service table
// --------------------------------------------------------------------------

type CloudIntegration struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	Identifiable
	TimeAuditable
	Provider        string         `json:"provider" bun:"provider,type:text,unique:provider_id"`
	Config          *AccountConfig `json:"config" bun:"config,type:text"`
	AccountID       *string        `json:"account_id" bun:"account_id,type:text"`
	LastAgentReport *AgentReport   `json:"last_agent_report" bun:"last_agent_report,type:text"`
	RemovedAt       *time.Time     `json:"removed_at" bun:"removed_at,type:timestamp"`
	OrgID           string         `bun:"org_id,type:text,unique:provider_id"`
}

func (a *CloudIntegration) Status() AccountStatus {
	status := AccountStatus{}
	if a.LastAgentReport != nil {
		lastHeartbeat := a.LastAgentReport.TimestampMillis
		status.Integration.LastHeartbeatTsMillis = &lastHeartbeat
	}
	return status
}

func (a *CloudIntegration) Account() Account {
	ca := Account{Id: a.ID.StringValue(), Status: a.Status()}

	if a.AccountID != nil {
		ca.CloudAccountId = *a.AccountID
	}

	if a.Config != nil {
		ca.Config = *a.Config
	} else {
		ca.Config = DefaultAccountConfig()
	}
	return ca
}

type Account struct {
	Id             string        `json:"id"`
	CloudAccountId string        `json:"cloud_account_id"`
	Config         AccountConfig `json:"config"`
	Status         AccountStatus `json:"status"`
}

type AccountStatus struct {
	Integration AccountIntegrationStatus `json:"integration"`
}

type AccountIntegrationStatus struct {
	LastHeartbeatTsMillis *int64 `json:"last_heartbeat_ts_ms"`
}

func DefaultAccountConfig() AccountConfig {
	return AccountConfig{
		EnabledRegions: []string{},
	}
}

type AccountConfig struct {
	EnabledRegions []string `json:"regions"`
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

type CloudIntegrationServiceConfig struct {
	bun.BaseModel `bun:"table:cloud_integrations_service_configs"`

	CloudProvider  string    `bun:"cloud_provider,type:text,notnull,unique:service_cloud_provider_account"`
	CloudAccountID string    `bun:"cloud_account_id,type:text,notnull,unique:service_cloud_provider_account"`
	ServiceID      string    `bun:"service_id,type:text,notnull,unique:service_cloud_provider_account"`
	ConfigJSON     string    `bun:"config_json,type:text"`
	CreatedAt      time.Time `bun:"created_at,default:current_timestamp"`
}
