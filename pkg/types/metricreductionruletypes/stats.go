package metricreductionruletypes

// GettableReductionRuleStats is the aggregate volume-control summary across all of an org's rules.
type GettableReductionRuleStats struct {
	IngestedSeries             uint64  `json:"ingestedSeries" required:"true"`
	RetainedSeries             uint64  `json:"retainedSeries" required:"true"`
	IngestedSamples            uint64  `json:"ingestedSamples" required:"true"`
	RetainedSamples            uint64  `json:"retainedSamples" required:"true"`
	EstimatedMonthlySavingsUsd float64 `json:"estimatedMonthlySavingsUsd" required:"true"`
}
