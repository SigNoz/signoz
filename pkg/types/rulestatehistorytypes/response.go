package rulestatehistorytypes

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type RuleStateTimeline struct {
	Items []RuleStateHistory `json:"items" required:"true"`
	Total uint64             `json:"total" required:"true"`
}

type RuleStateTimelineResponse struct {
	Items      []RuleStateHistory `json:"items" required:"true"`
	Total      uint64             `json:"total" required:"true"`
	NextCursor string             `json:"nextCursor,omitempty"`
}

type RuleStateHistoryContributor struct {
	Fingerprint       uint64       `json:"fingerprint" ch:"fingerprint" required:"true"`
	Labels            LabelsString `json:"labels" ch:"labels" required:"true"`
	Count             uint64       `json:"count" ch:"count" required:"true"`
	RelatedTracesLink string       `json:"relatedTracesLink,omitempty"`
	RelatedLogsLink   string       `json:"relatedLogsLink,omitempty"`
}

type RuleStateWindow struct {
	State AlertState `json:"state" ch:"state" required:"true"`
	Start int64      `json:"start" ch:"start" required:"true"`
	End   int64      `json:"end" ch:"end" required:"true"`
}

type Stats struct {
	TotalCurrentTriggers           uint64              `json:"totalCurrentTriggers" required:"true"`
	TotalPastTriggers              uint64              `json:"totalPastTriggers" required:"true"`
	CurrentTriggersSeries          *qbtypes.TimeSeries `json:"currentTriggersSeries" required:"true" nullable:"true"`
	PastTriggersSeries             *qbtypes.TimeSeries `json:"pastTriggersSeries" required:"true" nullable:"true"`
	CurrentAvgResolutionTime       float64             `json:"currentAvgResolutionTime" required:"true"`
	PastAvgResolutionTime          float64             `json:"pastAvgResolutionTime" required:"true"`
	CurrentAvgResolutionTimeSeries *qbtypes.TimeSeries `json:"currentAvgResolutionTimeSeries" required:"true" nullable:"true"`
	PastAvgResolutionTimeSeries    *qbtypes.TimeSeries `json:"pastAvgResolutionTimeSeries" required:"true" nullable:"true"`
}
