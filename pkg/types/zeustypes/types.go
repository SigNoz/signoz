package zeustypes

import (
	"encoding/json"
	"net/url"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/tidwall/gjson"
)

type PostableHost struct {
	Name string `json:"name" required:"true"`
}

type PostableProfile struct {
	UsesOtel                     bool     `json:"uses_otel" required:"true"`
	HasExistingObservabilityTool bool     `json:"has_existing_observability_tool" required:"true"`
	ExistingObservabilityTool    string   `json:"existing_observability_tool" required:"true"`
	ReasonsForInterestInSigNoz   []string `json:"reasons_for_interest_in_signoz" required:"true"`
	LogsScalePerDayInGB          int64    `json:"logs_scale_per_day_in_gb" required:"true"`
	NumberOfServices             int64    `json:"number_of_services" required:"true"`
	NumberOfHosts                int64    `json:"number_of_hosts" required:"true"`
	WhereDidYouDiscoverSigNoz    string   `json:"where_did_you_discover_signoz" required:"true"`
	TimelineForMigratingToSigNoz string   `json:"timeline_for_migrating_to_signoz" required:"true"`
}

type GettableHost struct {
	Name  string `json:"name" required:"true"`
	State string `json:"state" required:"true"`
	Tier  string `json:"tier" required:"true"`
	Hosts []Host `json:"hosts" required:"true"`
}

type Host struct {
	Name      string `json:"name" required:"true"`
	IsDefault bool   `json:"is_default" required:"true"`
	URL       string `json:"url" required:"true"`
}

func NewGettableHost(data []byte) *GettableHost {
	parsed := gjson.ParseBytes(data)
	dns := parsed.Get("cluster.region.dns").String()

	hostResults := parsed.Get("hosts").Array()
	hosts := make([]Host, len(hostResults))

	for i, h := range hostResults {
		name := h.Get("name").String()
		hosts[i].Name = name
		hosts[i].IsDefault = h.Get("is_default").Bool()
		hosts[i].URL = (&url.URL{Scheme: "https", Host: name + "." + dns}).String()
	}

	return &GettableHost{
		Name:  parsed.Get("name").String(),
		State: parsed.Get("state").String(),
		Tier:  parsed.Get("tier").String(),
		Hosts: hosts,
	}
}

// GettableDeployment represents the parsed deployment info from zeus.GetDeployment.
// NOTE: break down deployment into multiple structs if needed.
type GettableDeployment struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	State     string    `json:"state"`
	Tier      string    `json:"tier"`
	User      string    `json:"user"`
	LicenseID string    `json:"license_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	ClusterID string    `json:"cluster_id"`
	Hosts     []struct {
		Name      string `json:"name"`
		IsDefault bool   `json:"is_default"`
	} `json:"hosts"`
	Cluster struct {
		ID             string    `json:"id"`
		Name           string    `json:"name"`
		CloudProvider  string    `json:"cloud_provider"`
		CloudAccountID string    `json:"cloud_account_id"`
		CloudRegion    string    `json:"cloud_region"`
		Address        string    `json:"address"`
		Ca             string    `json:"ca"`
		Buffer         int       `json:"buffer"`
		CreatedAt      time.Time `json:"created_at"`
		UpdatedAt      time.Time `json:"updated_at"`
		RegionID       string    `json:"region_id"`
		Region         struct {
			ID        string    `json:"id"`
			Name      string    `json:"name"`
			Category  string    `json:"category"`
			DNS       string    `json:"dns"`
			CreatedAt time.Time `json:"created_at"`
			UpdatedAt time.Time `json:"updated_at"`
		} `json:"region"`
	} `json:"cluster"`
}

// NewGettableDeployment parses raw GetDeployment bytes into a GettableDeployment.
func NewGettableDeployment(data []byte) (*GettableDeployment, error) {
	deployment := new(GettableDeployment)
	err := json.Unmarshal(data, deployment)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to unmarshal deployment response")
	}

	return deployment, nil
}
