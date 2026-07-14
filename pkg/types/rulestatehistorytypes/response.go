package rulestatehistorytypes

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

type GettableRuleStateTimeline struct {
	Items      []GettableRuleStateHistory `json:"items" required:"true"`
	Total      uint64                     `json:"total" required:"true"`
	NextCursor string                     `json:"nextCursor,omitempty"`
}

type GettableRuleStateHistory struct {
	RuleID              string               `json:"ruleId" required:"true"`
	RuleName            string               `json:"ruleName" required:"true"`
	OverallState        ruletypes.AlertState `json:"overallState" required:"true"`
	OverallStateChanged bool                 `json:"overallStateChanged" required:"true"`
	State               ruletypes.AlertState `json:"state" required:"true"`
	StateChanged        bool                 `json:"stateChanged" required:"true"`
	UnixMilli           int64                `json:"unixMilli" required:"true"`
	Labels              []*qbtypes.Label     `json:"labels" required:"true"`
	Fingerprint         uint64               `json:"fingerprint" required:"true"`
	Value               float64              `json:"value" required:"true"`
}

type GettableRuleStateHistoryContributor struct {
	Fingerprint       uint64           `json:"fingerprint" required:"true"`
	Labels            []*qbtypes.Label `json:"labels" required:"true"`
	Count             uint64           `json:"count" required:"true"`
	RelatedTracesLink string           `json:"relatedTracesLink,omitempty"`
	RelatedLogsLink   string           `json:"relatedLogsLink,omitempty"`
}

type GettableRuleStateWindow struct {
	State ruletypes.AlertState `json:"state" ch:"state" required:"true"`
	Start int64                `json:"start" ch:"start" required:"true"`
	End   int64                `json:"end" ch:"end" required:"true"`
}

type GettableRuleStateHistoryStats struct {
	TotalCurrentTriggers           uint64              `json:"totalCurrentTriggers" required:"true"`
	TotalPastTriggers              uint64              `json:"totalPastTriggers" required:"true"`
	CurrentTriggersSeries          *qbtypes.TimeSeries `json:"currentTriggersSeries" required:"true" nullable:"true"`
	PastTriggersSeries             *qbtypes.TimeSeries `json:"pastTriggersSeries" required:"true" nullable:"true"`
	CurrentAvgResolutionTime       float64             `json:"currentAvgResolutionTime" required:"true"`
	PastAvgResolutionTime          float64             `json:"pastAvgResolutionTime" required:"true"`
	CurrentAvgResolutionTimeSeries *qbtypes.TimeSeries `json:"currentAvgResolutionTimeSeries" required:"true" nullable:"true"`
	PastAvgResolutionTimeSeries    *qbtypes.TimeSeries `json:"pastAvgResolutionTimeSeries" required:"true" nullable:"true"`
}
