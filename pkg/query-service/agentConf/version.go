package agenConf

import "github.com/google/uuid"

type ElementTypeDef string

const (
	ElementTypeSamplingRules ElementTypeDef = "sampling_rules"
	ElementTypeDropRules     ElementTypeDef = "drop_rules"
	ElementTypeLogPipelines  ElementTypeDef = "log_pipelines"
)

type Element interface {
	ID() string
}

type DeployStatus string

const (
	PendingDeploy DeployStatus = "DIRTY"
	Deploying     DeployStatus = "DEPLOYING"
	Deployed      DeployStatus = "DEPLOYED"
	DeployFailed  DeployStatus = "FAILED"
)

type ConfigVersion struct {
	ID          string         `json:"id" db:"id"`
	Version     float32        `json:"version" db:"version"`
	ElementType ElementTypeDef `json:"elementType" db:"element_type"`
	CreatedBy   string         `json:"createdBy" db:"id"`

	Active   bool `json:"active" db:"active"`
	IsValid  bool `json:"is_valid" db:"is_valid"`
	Disabled bool `json:"disabled" db:"disabled"`

	DeployStatus DeployStatus `json:"deployStatus" db:"deploy_status"`
	DeployResult string       `json:"deployResult" db:"deploy_result"`
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

func updateVersion(v float32) float32 {
	return v + 0.1
}

type ConfigElements struct {
	VersionID   string
	Version     float32
	ElementType ElementTypeDef
	ElementId   string
}
