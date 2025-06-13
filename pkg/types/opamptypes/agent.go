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
	bun.BaseModel `bun:"table:agent"`

	types.Identifiable
	types.TimeAuditable
	OrgID        string      `json:"orgId" yaml:"orgId" bun:"org_id,type:text"`
	TerminatedAt time.Time   `json:"terminatedAt" yaml:"terminatedAt" bun:"terminated_at,type:datetime"`
	Status       AgentStatus `json:"currentStatus" yaml:"currentStatus" bun:"status,type:text,notnull"`
	Config       string      `bun:"config,type:text,notnull"`
}

type ElementType struct{ valuer.String }

var (
	ElementTypeSamplingRules = ElementType{valuer.NewString("sampling_rules")}
	ElementTypeDropRules     = ElementType{valuer.NewString("drop_rules")}
	ElementTypeLogPipelines  = ElementType{valuer.NewString("log_pipelines")}
	ElementTypeLbExporter    = ElementType{valuer.NewString("lb_exporter")}
)

// NewElementType creates a new ElementType from a string value.
// Returns the corresponding ElementType constant if the string matches,
// otherwise returns an empty ElementType.
func NewElementType(value string) ElementType {
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
		return ElementType{valuer.NewString("")}
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
	bun.BaseModel `bun:"table:agent_config_version,alias:acv"`

	types.TimeAuditable
	types.UserAuditable

	CreatedByName string `json:"createdByName" bun:"created_by_name,scanonly"` // check if we can remove this,

	types.Identifiable
	OrgID          string       `json:"orgId" bun:"org_id,type:text"`
	Version        int          `json:"version" bun:"version,default:1,unique:element_version_idx"`
	ElementType    ElementType  `json:"elementType" bun:"element_type,notnull,type:varchar(120),unique:element_version_idx"`
	DeployStatus   DeployStatus `json:"deployStatus" bun:"deploy_status,notnull,type:varchar(80),default:'DIRTY'"`
	DeploySequence int          `json:"deploySequence" bun:"deploy_sequence"`
	DeployResult   string       `json:"deployResult" bun:"deploy_result,type:text"` // check if I can create a map in backend
	Hash           string       `json:"lastHash" bun:"hash,type:text"`              // check if we need to store this.
	Config         string       `json:"lastConfig" bun:"config,type:text"`
}

func NewAgentConfigVersion(orgId string, elementType ElementType) *AgentConfigVersion {
	return &AgentConfigVersion{
		OrgID:        orgId,
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		ElementType:  elementType,
		DeployStatus: PendingDeploy,
		Hash:         "",
		Config:       "{}",
	}
}

func UpdateVersion(v int) int {
	return v + 1
}

type AgentConfigElement struct {
	bun.BaseModel `bun:"table:agent_config_element"`

	types.Identifiable
	types.TimeAuditable
	ElementID   string `bun:"element_id,type:text,notnull,unique:agent_config_elements_u1"`
	ElementType string `bun:"element_type,type:varchar(120),notnull,unique:agent_config_elements_u1"`
	VersionID   string `bun:"version_id,type:text,notnull,unique:agent_config_elements_u1"`
}
