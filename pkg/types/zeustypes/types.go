package zeustypes

import "github.com/tidwall/gjson"

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
	Hosts []Host `json:"hosts"`
}

type Host struct {
	Name      string `json:"name"`
	IsDefault bool   `json:"is_default"`
	URL       string `json:"url"`
}

func NewGettableZeusHost(data []byte) *GettableZeusHost {
	parsed := gjson.ParseBytes(data)
	dns := parsed.Get("cluster.region.dns").String()

	hostResults := parsed.Get("hosts").Array()
	hosts := make([]Host, len(hostResults))

	for i, h := range hostResults {
		name := h.Get("name").String()
		hosts[i].Name = name
		hosts[i].IsDefault = h.Get("is_default").Bool()
		hosts[i].URL = name + "." + dns
	}

	return &GettableZeusHost{
		Name:  parsed.Get("name").String(),
		State: parsed.Get("state").String(),
		Tier:  parsed.Get("tier").String(),
		Hosts: hosts,
	}
}
