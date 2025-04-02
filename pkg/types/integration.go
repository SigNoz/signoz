package types

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/pkg/errors"
	"github.com/uptrace/bun"
)

// unique org_id, type
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

type CloudIntegrationAccount struct {
	bun.BaseModel `bun:"table:cloud_integrations_accounts"`

	CloudProvider       string    `bun:"cloud_provider,type:text,unique:cloud_provider_id"`
	ID                  string    `bun:"id,type:text,notnull,unique:cloud_provider_id"`
	ConfigJSON          string    `bun:"config_json,type:text"`
	CloudAccountID      string    `bun:"cloud_account_id,type:text"`
	LastAgentReportJSON string    `bun:"last_agent_report_json,type:text"`
	CreatedAt           time.Time `bun:"created_at,notnull,default:current_timestamp"`
	RemovedAt           time.Time `bun:"removed_at,type:timestamp"`
}

type CloudIntegrationServiceConfig struct {
	bun.BaseModel `bun:"table:cloud_integrations_service_configs"`

	CloudProvider  string    `bun:"cloud_provider,type:text,notnull,unique:service_cloud_provider_account"`
	CloudAccountID string    `bun:"cloud_account_id,type:text,notnull,unique:service_cloud_provider_account"`
	ServiceID      string    `bun:"service_id,type:text,notnull,unique:service_cloud_provider_account"`
	ConfigJSON     string    `bun:"config_json,type:text"`
	CreatedAt      time.Time `bun:"created_at,default:current_timestamp"`
}
