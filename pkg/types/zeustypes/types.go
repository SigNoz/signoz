package zeustypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type PostableHost struct {
	Name string `json:"name" required:"true"`
}

type PostableProfile struct {
	UsesOtel                     bool     `json:"uses_otel"`
	HasExistingObservabilityTool bool     `json:"has_existing_observability_tool"`
	ExistingObservabilityTool    string   `json:"existing_observability_tool"`
	ReasonsForInterestInSigNoz   []string `json:"reasons_for_interest_in_signoz"`
	LogsScalePerDayInGB          int64    `json:"logs_scale_per_day_in_gb"`
	NumberOfServices             int64    `json:"number_of_services"`
	NumberOfHosts                int64    `json:"number_of_hosts"`
	WhereDidYouDiscoverSigNoz    string   `json:"where_did_you_discover_signoz"`
	TimelineForMigratingToSigNoz string   `json:"timeline_for_migrating_to_signoz"`
}

type GettableDeployment struct {
	DeploymentModel
	Cluster   ClusterResponseModel     `json:"cluster"`
	Histories []DeploymentHistoryModel `json:"histories"`
}

type DeploymentModel struct {
	ID        valuer.UUID `json:"id"`
	Name      string      `json:"name"`
	State     string      `json:"state"`
	Tier      string      `json:"tier"`
	User      string      `json:"user"`
	LicenseID string      `json:"license_id,omitempty"`
	Password  string      `json:"password,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	ClusterID valuer.UUID `json:"cluster_id"`
	Hosts     []HostModel `json:"hosts,omitempty"`
}

type ClusterResponseModel struct {
	ClusterModel
	Region RegionModel `json:"region"`
}

type DeploymentHistoryModel struct {
	ID           valuer.UUID `json:"id"`
	StateBefore  string      `json:"state_before"`
	StateAfter   string      `json:"state_after"`
	Event        string      `json:"event"`
	CreatedAt    time.Time   `json:"created_at"`
	DeploymentID valuer.UUID `json:"deployment_id"`
}

type HostModel struct {
	Name      string `json:"name"`
	IsDefault bool   `json:"is_default"`
}

type ClusterModel struct {
	ID             valuer.UUID `json:"id"`
	Name           string      `json:"name"`
	CloudProvider  string      `json:"cloud_provider"`
	CloudAccountID string      `json:"cloud_account_id"`
	CloudRegion    string      `json:"cloud_region"`
	Address        string      `json:"address"`
	Ca             string      `json:"ca"`
	Buffer         int64       `json:"buffer"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
	RegionID       valuer.UUID `json:"region_id"`
}

type RegionModel struct {
	ID        valuer.UUID `json:"id"`
	Name      string      `json:"name"`
	Category  string      `json:"category"`
	DNS       string      `json:"dns"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}
