package alertmanagertypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeInvalidStateHistoryQuery = errors.MustNewCode("invalid_state_history_query")
)

// AlertState represents the state of an alert series (firing, inactive, muted, no_data)
// or the overall state of a rule (firing, inactive).
type AlertState struct {
	valuer.String
}

var (
	AlertStateFiring   = AlertState{valuer.NewString("firing")}
	AlertStateInactive = AlertState{valuer.NewString("inactive")}
	AlertStateMuted    = AlertState{valuer.NewString("muted")}
	AlertStateNoData   = AlertState{valuer.NewString("no_data")}
)

// SortOrder represents the sort direction for query results.
type SortOrder struct {
	valuer.String
}

var (
	SortOrderAsc  = SortOrder{valuer.NewString("asc")}
	SortOrderDesc = SortOrder{valuer.NewString("desc")}
)

// RuleStateHistory represents a single state transition entry stored in ClickHouse.
// Only transitions are recorded, not every evaluation.
type RuleStateHistory struct {
	OrgID               string  `json:"orgId"`
	RuleID              string  `json:"ruleId"`
	RuleName            string  `json:"ruleName"`
	OverallState        string  `json:"overallState"`        // aggregate rule state: "firing" if any series fires
	OverallStateChanged bool    `json:"overallStateChanged"` // true if this entry changed the overall state
	State               string  `json:"state"`               // per-series state: firing, inactive, muted, no_data
	StateChanged        bool    `json:"stateChanged"`        // always true in v2 (only transitions stored)
	UnixMilli           int64   `json:"unixMilli"`
	Labels              string  `json:"labels"`      // JSON-encoded label set
	Fingerprint         uint64  `json:"fingerprint"` // hash of the full label set
	Value               float64 `json:"value"`
}

// QueryRuleStateHistory is the request body for all v2 state history API endpoints.
type QueryRuleStateHistory struct {
	Start  int64      `json:"start"`  // unix millis, required
	End    int64      `json:"end"`    // unix millis, required
	State  AlertState `json:"state"`  // optional filter: firing, inactive, muted
	Offset int64      `json:"offset"`
	Limit  int64      `json:"limit"`
	Order  SortOrder  `json:"order"`
}

func (q *QueryRuleStateHistory) Validate() error {
	if q.Start == 0 || q.End == 0 {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidStateHistoryQuery, "start and end are required")
	}
	if q.Offset < 0 || q.Limit < 0 {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidStateHistoryQuery, "offset and limit must be greater than or equal to 0")
	}
	if q.Order.StringValue() != SortOrderAsc.StringValue() && q.Order.StringValue() != SortOrderDesc.StringValue() {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidStateHistoryQuery, "order must be asc or desc")
	}
	return nil
}

// RuleStateTimeline is the paginated response for the timeline endpoint.
type RuleStateTimeline struct {
	Items  []RuleStateHistory  `json:"items"`
	Total  uint64              `json:"total"`
	Labels map[string][]string `json:"labels"` // distinct label keys/values for filter UI
}

// RuleStateHistoryContributor is an alert series ranked by firing frequency.
type RuleStateHistoryContributor struct {
	Fingerprint uint64 `json:"fingerprint"`
	Labels      string `json:"labels"` // JSON-encoded label set
	Count       uint64 `json:"count"`
}

// RuleStateTransition represents a contiguous time period during which a rule
// was in a particular overall state (firing or inactive).
type RuleStateTransition struct {
	State AlertState `json:"state"`
	Start int64      `json:"start"`
	End   int64      `json:"end"`
}

// RuleStats compares trigger counts and avg resolution times between the current
// time period and a previous period of equal length.
type RuleStats struct {
	TotalCurrentTriggers           uint64  `json:"totalCurrentTriggers"`
	TotalPastTriggers              uint64  `json:"totalPastTriggers"`
	CurrentTriggersSeries          *Series `json:"currentTriggersSeries"`
	PastTriggersSeries             *Series `json:"pastTriggersSeries"`
	CurrentAvgResolutionTime       float64 `json:"currentAvgResolutionTime"`
	PastAvgResolutionTime          float64 `json:"pastAvgResolutionTime"`
	CurrentAvgResolutionTimeSeries *Series `json:"currentAvgResolutionTimeSeries"`
	PastAvgResolutionTimeSeries    *Series `json:"pastAvgResolutionTimeSeries"`
}

type Series struct {
	Labels map[string]string `json:"labels"`
	Points []Point           `json:"values"`
}

type Point struct {
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value"`
}

// StateHistoryStore provides read and write access to rule state history in ClickHouse.
type StateHistoryStore interface {
	WriteRuleStateHistory(ctx context.Context, entries []RuleStateHistory) error
	// GetLastSavedRuleStateHistory returns the most recent transition per fingerprint,
	// used to restore in-memory state after restart.
	GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]RuleStateHistory, error)

	GetRuleStateHistoryTimeline(ctx context.Context, orgID string, ruleID string, params *QueryRuleStateHistory) (*RuleStateTimeline, error)
	GetRuleStateHistoryTopContributors(ctx context.Context, orgID string, ruleID string, params *QueryRuleStateHistory) ([]RuleStateHistoryContributor, error)
	// GetOverallStateTransitions returns firing/inactive periods with gap-filling.
	GetOverallStateTransitions(ctx context.Context, orgID string, ruleID string, params *QueryRuleStateHistory) ([]RuleStateTransition, error)
	GetTotalTriggers(ctx context.Context, orgID string, ruleID string, params *QueryRuleStateHistory) (uint64, error)
	GetTriggersByInterval(ctx context.Context, orgID string, ruleID string, params *QueryRuleStateHistory) (*Series, error)
	// GetAvgResolutionTime returns avg seconds between firing and next resolution.
	GetAvgResolutionTime(ctx context.Context, orgID string, ruleID string, params *QueryRuleStateHistory) (float64, error)
	GetAvgResolutionTimeByInterval(ctx context.Context, orgID string, ruleID string, params *QueryRuleStateHistory) (*Series, error)
}
