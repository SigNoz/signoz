package types

import (
	"time"

	"github.com/uptrace/bun"
)

type Integration struct {
	bun.BaseModel `bun:"table:integrations_installed"`

	IntegrationID string    `bun:"integration_id,pk,type:text"`
	ConfigJSON    string    `bun:"config_json,type:text"`
	InstalledAt   time.Time `bun:"installed_at,default:current_timestamp"`
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
