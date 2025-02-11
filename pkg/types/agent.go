package types

import (
	"time"

	"github.com/uptrace/bun"
)

type Agent struct {
	bun.BaseModel   `bun:"table:agents"`
	AgentID         string    `bun:"agent_id,pk,type:text"`
	StartedAt       time.Time `bun:"started_at,type:datetime,notnull"`
	TerminatedAt    time.Time `bun:"terminated_at,type:datetime"`
	CurrentStatus   string    `bun:"current_status,type:text,notnull"`
	EffectiveConfig string    `bun:"effective_config,type:text,notnull"`
}

type AgentConfigVersion struct {
	bun.BaseModel `bun:"table:agent_config_versions"`

	ID             string    `bun:"id,pk,type:text"`
	CreatedBy      string    `bun:"created_by,type:text"`
	CreatedAt      time.Time `bun:"created_at,default:CURRENT_TIMESTAMP"`
	UpdatedBy      string    `bun:"updated_by,type:text"`
	UpdatedAt      time.Time `bun:"updated_at,default:CURRENT_TIMESTAMP"`
	Version        int       `bun:"version,default:1,unique:element_version_idx"`
	Active         int       `bun:"active"`
	IsValid        int       `bun:"is_valid"`
	Disabled       int       `bun:"disabled"`
	ElementType    string    `bun:"element_type,notnull,type:varchar(120),unique:element_version_idx"`
	DeployStatus   string    `bun:"deploy_status,notnull,type:varchar(80),default:'DIRTY'"`
	DeploySequence int       `bun:"deploy_sequence"`
	DeployResult   string    `bun:"deploy_result,type:text"`
	LastHash       string    `bun:"last_hash,type:text"`
	LastConfig     string    `bun:"last_config,type:text"`
}

type AgentConfigElement struct {
	bun.BaseModel `bun:"table:agent_config_elements"`

	ID          string    `bun:"id,pk,type:text"`
	CreatedBy   string    `bun:"created_by,type:text"`
	CreatedAt   time.Time `bun:"created_at,default:CURRENT_TIMESTAMP"`
	UpdatedBy   string    `bun:"updated_by,type:text"`
	UpdatedAt   time.Time `bun:"updated_at,default:CURRENT_TIMESTAMP"`
	ElementID   string    `bun:"element_id,type:text,notnull,unique:agent_config_elements_u1"`
	ElementType string    `bun:"element_type,type:varchar(120),notnull,unique:agent_config_elements_u1"`
	VersionID   string    `bun:"version_id,type:text,notnull,unique:agent_config_elements_u1"`
}
