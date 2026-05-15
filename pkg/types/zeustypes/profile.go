package zeustypes

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
