package opamptypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types"
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

	types.Identifiable
	OrgID           string      `json:"orgId" yaml:"orgId" bun:"org_id,type:text"`
	StartedAt       time.Time   `json:"startedAt" yaml:"startedAt" bun:"started_at,type:datetime,notnull"`
	TerminatedAt    time.Time   `json:"terminatedAt" yaml:"terminatedAt" bun:"terminated_at,type:datetime"`
	CurrentStatus   AgentStatus `json:"currentStatus" yaml:"currentStatus" bun:"current_status,type:text,notnull"`
	EffectiveConfig string      `bun:"effective_config,type:text,notnull"`
}

type ElementTypeDef struct{ valuer.String }

var (
	ElementTypeSamplingRules = ElementTypeDef{valuer.NewString("sampling_rules")}
	ElementTypeDropRules     = ElementTypeDef{valuer.NewString("drop_rules")}
	ElementTypeLogPipelines  = ElementTypeDef{valuer.NewString("log_pipelines")}
	ElementTypeLbExporter    = ElementTypeDef{valuer.NewString("lb_exporter")}
)

// NewElementTypeDef creates a new ElementTypeDef from a string value.
// Returns the corresponding ElementTypeDef constant if the string matches,
// otherwise returns an empty ElementTypeDef.
func NewElementTypeDef(value string) ElementTypeDef {
	switch valuer.NewString(value) {
	case ElementTypeSamplingRules.String:
		return ElementTypeSamplingRules
	case ElementTypeDropRules.String:
		return ElementTypeDropRules
	case ElementTypeLogPipelines.String:
		return ElementTypeLogPipelines
	case ElementTypeLbExporter.String:
		return ElementTypeLbExporter
	default:
		return ElementTypeDef{valuer.NewString("")}
	}
}

type DeployStatus struct{ valuer.String }

var (
	PendingDeploy       = DeployStatus{valuer.NewString("DIRTY")}
	Deploying           = DeployStatus{valuer.NewString("DEPLOYING")}
	Deployed            = DeployStatus{valuer.NewString("DEPLOYED")}
	DeployInitiated     = DeployStatus{valuer.NewString("IN_PROGRESS")}
	DeployFailed        = DeployStatus{valuer.NewString("FAILED")}
	DeployStatusUnknown = DeployStatus{valuer.NewString("UNKNOWN")}
)

type AgentConfigVersion struct {
	bun.BaseModel `bun:"table:agent_config_versions,alias:acv"`

	types.TimeAuditable
	types.UserAuditable

	CreatedByName string `json:"createdByName" bun:"created_by_name,scanonly"`

	types.Identifiable
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
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
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

	types.Identifiable
	OrgID       string    `bun:"org_id,type:text"`
	CreatedBy   string    `bun:"created_by,type:text"`
	CreatedAt   time.Time `bun:"created_at,default:CURRENT_TIMESTAMP"`
	UpdatedBy   string    `bun:"updated_by,type:text"`
	UpdatedAt   time.Time `bun:"updated_at,default:CURRENT_TIMESTAMP"`
	ElementID   string    `bun:"element_id,type:text,notnull,unique:agent_config_elements_u1"`
	ElementType string    `bun:"element_type,type:varchar(120),notnull,unique:agent_config_elements_u1"`
	VersionID   string    `bun:"version_id,type:text,notnull,unique:agent_config_elements_u1"`
}
