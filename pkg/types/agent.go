package types

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type AgentStatus int

const (
	AgentStatusUnknown AgentStatus = iota
	AgentStatusConnected
	AgentStatusDisconnected
)

type StorableAgent struct {
	bun.BaseModel `bun:"table:agents"`

	Identifiable
	OrgID           string      `json:"orgId" yaml:"orgId" bun:"org_id,type:text"`
	StartedAt       time.Time   `json:"startedAt" yaml:"startedAt" bun:"started_at,type:datetime,notnull"`
	TerminatedAt    time.Time   `json:"terminatedAt" yaml:"terminatedAt" bun:"terminated_at,type:datetime"`
	CurrentStatus   AgentStatus `json:"currentStatus" yaml:"currentStatus" bun:"current_status,type:text,notnull"`
	EffectiveConfig string      `bun:"effective_config,type:text,notnull"`
}

type ElementTypeDef string

const (
	ElementTypeSamplingRules ElementTypeDef = "sampling_rules"
	ElementTypeDropRules     ElementTypeDef = "drop_rules"
	ElementTypeLogPipelines  ElementTypeDef = "log_pipelines"
	ElementTypeLbExporter    ElementTypeDef = "lb_exporter"
)

type DeployStatus string

const (
	PendingDeploy       DeployStatus = "DIRTY"
	Deploying           DeployStatus = "DEPLOYING"
	Deployed            DeployStatus = "DEPLOYED"
	DeployInitiated     DeployStatus = "IN_PROGRESS"
	DeployFailed        DeployStatus = "FAILED"
	DeployStatusUnknown DeployStatus = "UNKNOWN"
)

type AgentConfigVersion struct {
	bun.BaseModel `bun:"table:agent_config_versions,alias:acv"`

	TimeAuditable
	UserAuditable

	CreatedByName string `json:"createdByName" bun:"created_by_name,scanonly"`

	Identifiable
	OrgID          string         `json:"orgId" bun:"org_id,type:text"`
	Version        int            `json:"version" bun:"version,default:1,unique:element_version_idx"`
	Active         bool           `json:"active" bun:"active"`
	IsValid        bool           `json:"is_valid" bun:"is_valid"`
	Disabled       bool           `json:"disabled" bun:"disabled"`
	ElementType    ElementTypeDef `json:"elementType" bun:"element_type,notnull,type:varchar(120),unique:element_version_idx"`
	DeployStatus   DeployStatus   `json:"deployStatus" bun:"deploy_status,notnull,type:varchar(80),default:'DIRTY'"`
	DeploySequence int            `json:"deploySequence" bun:"deploy_sequence"`
	DeployResult   string         `json:"deployResult" bun:"deploy_result,type:text"`
	LastHash       string         `json:"lastHash" bun:"last_hash,type:text"`
	LastConfig     string         `json:"lastConfig" bun:"last_config,type:text"`
}

func NewAgentConfigVersion(orgId string, typeDef ElementTypeDef) *AgentConfigVersion {
	return &AgentConfigVersion{
		OrgID:        orgId,
		Identifiable: Identifiable{ID: valuer.GenerateUUID()},
		ElementType:  typeDef,
		Active:       false,
		IsValid:      false,
		Disabled:     false,
		DeployStatus: PendingDeploy,
		LastHash:     "",
		LastConfig:   "{}",
	}
}

func UpdateVersion(v int) int {
	return v + 1
}

type AgentConfigElement struct {
	bun.BaseModel `bun:"table:agent_config_elements"`

	Identifiable
	OrgID       string    `bun:"org_id,type:text"`
	CreatedBy   string    `bun:"created_by,type:text"`
	CreatedAt   time.Time `bun:"created_at,default:CURRENT_TIMESTAMP"`
	UpdatedBy   string    `bun:"updated_by,type:text"`
	UpdatedAt   time.Time `bun:"updated_at,default:CURRENT_TIMESTAMP"`
	ElementID   string    `bun:"element_id,type:text,notnull,unique:agent_config_elements_u1"`
	ElementType string    `bun:"element_type,type:varchar(120),notnull,unique:agent_config_elements_u1"`
	VersionID   string    `bun:"version_id,type:text,notnull,unique:agent_config_elements_u1"`
}
