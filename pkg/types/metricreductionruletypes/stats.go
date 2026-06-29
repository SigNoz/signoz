package metricreductionruletypes

// GettableReductionRuleStats is the aggregate volume-control summary across all of an org's rules.
type GettableReductionRuleStats struct {
	IngestedSeries             uint64  `json:"ingestedSeries" required:"true"`
	RetainedSeries             uint64  `json:"retainedSeries" required:"true"`
	EstimatedMonthlySavingsUsd float64 `json:"estimatedMonthlySavingsUsd" required:"true"`
}
