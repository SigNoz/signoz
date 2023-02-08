package agentConf

import (
	"database/sql"

	"github.com/google/uuid"
)

type ElementTypeDef string

const (
	ElementTypeSamplingRules ElementTypeDef = "sampling_rules"
	ElementTypeDropRules     ElementTypeDef = "drop_rules"
	ElementTypeLogPipelines  ElementTypeDef = "log_pipelines"
)

type DeployStatus string

const (
	PendingDeploy DeployStatus = "DIRTY"
	Deploying     DeployStatus = "DEPLOYING"
	Deployed      DeployStatus = "DEPLOYED"
	DeployFailed  DeployStatus = "FAILED"
)

type ConfigVersion struct {
	ID          string         `json:"id" db:"id"`
	Version     int            `json:"version" db:"version"`
	ElementType ElementTypeDef `json:"elementType" db:"element_type"`
	CreatedBy   sql.NullString `json:"createdBy" db:"created_by"`

	Active   bool `json:"active" db:"active"`
	IsValid  bool `json:"is_valid" db:"is_valid"`
	Disabled bool `json:"disabled" db:"disabled"`

	DeployStatus DeployStatus   `json:"deployStatus" db:"deploy_status"`
	DeployResult sql.NullString `json:"deployResult" db:"deploy_result"`
}

func NewConfigversion(typeDef ElementTypeDef) *ConfigVersion {
	return &ConfigVersion{
		ID:           uuid.NewString(),
		ElementType:  typeDef,
		Active:       false,
		IsValid:      false,
		Disabled:     false,
		DeployStatus: PendingDeploy,
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
