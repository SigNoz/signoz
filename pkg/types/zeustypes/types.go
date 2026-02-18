package zeustypes

import "encoding/json"

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

type GettableZeusHost struct {
	Name  string `json:"name"`
	State string `json:"state"`
	Tier  string `json:"tier"`
	Hosts []struct {
		Name      string `json:"name"`
		IsDefault bool   `json:"is_default"`
		URL       string `json:"url"`
	} `json:"hosts"`
}

func NewGettableZeusHost(data []byte) *GettableZeusHost {
	type zeusDeploymentResponse struct {
		Name  string `json:"name"`
		State string `json:"state"`
		Tier  string `json:"tier"`
		Hosts []struct {
			Name      string `json:"name"`
			IsDefault bool   `json:"is_default"`
		} `json:"hosts"`
		Cluster struct {
			Region struct {
				DNS string `json:"dns"`
			} `json:"region"`
		} `json:"cluster"`
	}
	
	deployment := new(zeusDeploymentResponse)
	if err := json.Unmarshal(data, deployment); err != nil {
		return nil
	}

	dns := deployment.Cluster.Region.DNS

	hosts := make([]struct {
		Name      string `json:"name"`
		IsDefault bool   `json:"is_default"`
		URL       string `json:"url"`
	}, len(deployment.Hosts))

	for i, h := range deployment.Hosts {
		hosts[i].Name = h.Name
		hosts[i].IsDefault = h.IsDefault
		hosts[i].URL = h.Name + "." + dns
	}

	return &GettableZeusHost{
		Name:  deployment.Name,
		State: deployment.State,
		Tier:  deployment.Tier,
		Hosts: hosts,
	}
}
