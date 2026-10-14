package slo

type SLIType string

const (
	SLITypeRatio            SLIType = "ratio"
	SLITypeLatencyThreshold SLIType = "latency_threshold"
	SLITypeCompleteness     SLIType = "completeness"
	SLITypeGroundedAnswers  SLIType = "grounded_answers"
)

type State string

const (
	StateHealthy       State = "healthy"
	StateUnhealthy     State = "unhealthy"
	StateIndeterminate State = "indeterminate"
)

type GateResult struct {
	Coverage      float64 `json:"coverage"`
	QueryComplete bool    `json:"query_complete"`
	Trusted       bool    `json:"trusted"`
	Reason        string  `json:"reason,omitempty"`
}

type Report struct {
	SchemaVersion        string     `json:"schema_version"`
	Name                 string     `json:"name"`
	Service              string     `json:"service"`
	Environment          string     `json:"environment"`
	Type                 SLIType    `json:"type"`
	Window               string     `json:"window"`
	State                State      `json:"state"`
	SLI                  float64    `json:"sli,omitempty"`
	Target               float64    `json:"target"`
	Completeness         float64    `json:"completeness"`
	ErrorBudgetRemaining float64    `json:"error_budget_remaining,omitempty"`
	BurnRate             float64    `json:"burn_rate,omitempty"`
	Gate                 GateResult `json:"gate"`
	Error                string     `json:"error,omitempty"`
}

type BurnTier struct {
	Name        string
	LongWindow  string
	ShortWindow string
	Threshold   float64
	Severity    string
}

var DefaultBurnTiers = []BurnTier{
	{Name: "fast", LongWindow: "1h", ShortWindow: "5m", Threshold: 14.4, Severity: "page"},
	{Name: "medium", LongWindow: "6h", ShortWindow: "30m", Threshold: 6, Severity: "ticket"},
	{Name: "slow", LongWindow: "24h", ShortWindow: "2h", Threshold: 3, Severity: "ticket"},
}
