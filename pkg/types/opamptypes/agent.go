package opamptypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
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
	// AgentID is needed as the ID from opamp client is ULID and not UUID, so we are keeping it like this
	AgentID      string      `json:"agentId" yaml:"agentId" bun:"agent_id,type:text,notnull,unique"`
	OrgID        valuer.UUID `json:"orgId" yaml:"orgId" bun:"org_id,type:text,notnull"`
	TerminatedAt time.Time   `json:"terminatedAt" yaml:"terminatedAt" bun:"terminated_at"`
	Status       AgentStatus `json:"currentStatus" yaml:"currentStatus" bun:"status,type:text,notnull"`
	Config       string      `bun:"config,type:text,notnull"`
}

func NewStorableAgent(store sqlstore.SQLStore, orgID valuer.UUID, agentID string, status AgentStatus) StorableAgent {
	return StorableAgent{
		OrgID:         orgID,
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		AgentID:       agentID,
		TimeAuditable: types.TimeAuditable{CreatedAt: time.Now(), UpdatedAt: time.Now()},
		Status:        status,
	}
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
	PendingDeploy       = DeployStatus{valuer.NewString("dirty")}
	Deploying           = DeployStatus{valuer.NewString("deploying")}
	Deployed            = DeployStatus{valuer.NewString("deployed")}
	DeployInitiated     = DeployStatus{valuer.NewString("in_progress")}
	DeployFailed        = DeployStatus{valuer.NewString("failed")}
	DeployStatusUnknown = DeployStatus{valuer.NewString("unknown")}
)

type AgentConfigVersion struct {
	bun.BaseModel `bun:"table:agent_config_version,alias:acv"`

	// this is only for reading
	// keeping it here since we query the actual data from users table
	CreatedByName string `json:"createdByName" bun:"created_by_name,scanonly"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	OrgID          valuer.UUID  `json:"orgId" bun:"org_id,type:text,notnull,unique:element_version_org_idx"`
	Version        int          `json:"version" bun:"version,unique:element_version_org_idx"`
	ElementType    ElementType  `json:"elementType" bun:"element_type,type:text,notnull,unique:element_version_org_idx"`
	DeployStatus   DeployStatus `json:"deployStatus" bun:"deploy_status,type:text,notnull,default:'dirty'"`
	DeploySequence int          `json:"deploySequence" bun:"deploy_sequence"`
	DeployResult   string       `json:"deployResult" bun:"deploy_result,type:text"`
	Hash           string       `json:"lastHash" bun:"hash,type:text"`
	Config         string       `json:"config" bun:"config,type:text"`
}

func NewAgentConfigVersion(orgId valuer.UUID, userId valuer.UUID, elementType ElementType) *AgentConfigVersion {
	return &AgentConfigVersion{
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{CreatedBy: userId.String(), UpdatedBy: userId.String()},
		OrgID:         orgId,
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		ElementType:   elementType,
		DeployStatus:  PendingDeploy,
		Hash:          "",
		Config:        "{}",
	}
}

func (a *AgentConfigVersion) IncrementVersion(lastVersion int) {
	a.Version = lastVersion + 1
}

type AgentConfigElement struct {
	bun.BaseModel `bun:"table:agent_config_element"`

	types.Identifiable
	types.TimeAuditable
	ElementID   string      `bun:"element_id,type:text,notnull,unique:element_type_version_idx"`
	ElementType string      `bun:"element_type,type:text,notnull,unique:element_type_version_idx"`
	VersionID   valuer.UUID `bun:"version_id,type:text,notnull,unique:element_type_version_idx"`
}
