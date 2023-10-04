package agentConf

import (
	"time"

	"github.com/google/uuid"
)

type DeployStatus string

const (
	PendingDeploy   DeployStatus = "DIRTY"
	Deploying       DeployStatus = "DEPLOYING"
	Deployed        DeployStatus = "DEPLOYED"
	DeployInitiated DeployStatus = "IN_PROGRESS"
	DeployFailed    DeployStatus = "FAILED"
)

type ConfigVersion struct {
	ID          string                   `json:"id" db:"id"`
	Version     int                      `json:"version" db:"version"`
	ElementType PreprocessingFeatureType `json:"elementType" db:"element_type"`
	Active      bool                     `json:"active" db:"active"`
	IsValid     bool                     `json:"is_valid" db:"is_valid"`
	Disabled    bool                     `json:"disabled" db:"disabled"`

	DeployStatus DeployStatus `json:"deployStatus" db:"deploy_status"`
	DeployResult string       `json:"deployResult" db:"deploy_result"`

	LastHash string `json:"lastHash" db:"last_hash"`
	LastConf string `json:"lastConf" db:"last_config"`

	CreatedBy     string    `json:"createdBy" db:"created_by"`
	CreatedByName string    `json:"createdByName" db:"created_by_name"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

func NewConfigversion(typeDef PreprocessingFeatureType) *ConfigVersion {
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
	ElementType PreprocessingFeatureType
	ElementId   string
}
