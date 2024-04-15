package agentConf

import (
	"time"

	"github.com/google/uuid"
)

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

type ConfigVersion struct {
	ID          string         `json:"id" db:"id"`
	Version     int            `json:"version" db:"version"`
	ElementType ElementTypeDef `json:"elementType" db:"element_type"`
	Active      bool           `json:"active" db:"active"`
	IsValid     bool           `json:"is_valid" db:"is_valid"`
	Disabled    bool           `json:"disabled" db:"disabled"`

	DeployStatus DeployStatus `json:"deployStatus" db:"deploy_status"`
	DeployResult string       `json:"deployResult" db:"deploy_result"`

	LastHash string `json:"lastHash" db:"last_hash"`
	LastConf string `json:"lastConf" db:"last_config"`

	CreatedBy     string    `json:"createdBy" db:"created_by"`
	CreatedByName string    `json:"createdByName" db:"created_by_name"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

func NewConfigVersion(typeDef ElementTypeDef) *ConfigVersion {
	return &ConfigVersion{
		ID:           uuid.NewString(),
		ElementType:  typeDef,
		Active:       false,
		IsValid:      false,
		Disabled:     false,
		DeployStatus: PendingDeploy,
		LastHash:     "",
		LastConf:     "{}",
		// todo: get user id from context?
		// CreatedBy
	}
}

func updateVersion(v int) int {
	return v + 1
}

type ConfigElements struct {
	VersionID   string
	Version     int
	ElementType ElementTypeDef
	ElementId   string
}
