package zeustypes

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
