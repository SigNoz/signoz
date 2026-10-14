package audit

type Status string

const (
	Pass          Status = "pass"
	Fail          Status = "fail"
	Indeterminate Status = "indeterminate"
	NotApplicable Status = "not_applicable"
)

type Finding struct {
	RuleID         string         `json:"rule_id"`
	RuleVersion    string         `json:"rule_version"`
	Status         Status         `json:"status"`
	Severity       string         `json:"severity"`
	Signal         string         `json:"signal"`
	AffectedCount  int            `json:"affected_count"`
	Observed       string         `json:"observed"`
	Expected       string         `json:"expected"`
	Recommendation string         `json:"recommendation"`
	Evidence       map[string]any `json:"evidence,omitempty"`
}

type Report struct {
	SchemaVersion string         `json:"schema_version"`
	Profile       string         `json:"profile"`
	Service       string         `json:"service"`
	Environment   string         `json:"environment"`
	Score         float64        `json:"score"`
	Coverage      float64        `json:"coverage"`
	QueryComplete bool           `json:"query_complete"`
	OverallStatus Status         `json:"overall_status"`
	Counts        map[string]int `json:"counts"`
	Findings      []Finding      `json:"findings"`
}
