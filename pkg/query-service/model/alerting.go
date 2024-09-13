package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"github.com/pkg/errors"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// AlertState denotes the state of an active alert.
type AlertState int

const (
	StateInactive AlertState = iota
	StatePending
	StateFiring
	StateNoData
	StateDisabled
)

func (s AlertState) String() string {
	switch s {
	case StateInactive:
		return "inactive"
	case StatePending:
		return "pending"
	case StateFiring:
		return "firing"
	case StateNoData:
		return "nodata"
	case StateDisabled:
		return "disabled"
	}
	panic(errors.Errorf("unknown alert state: %d", s))
}

func (s AlertState) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

func (s *AlertState) UnmarshalJSON(b []byte) error {
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	switch value := v.(type) {
	case string:
		switch value {
		case "inactive":
			*s = StateInactive
		case "pending":
			*s = StatePending
		case "firing":
			*s = StateFiring
		case "nodata":
			*s = StateNoData
		case "disabled":
			*s = StateDisabled
		default:
			*s = StateInactive
		}
		return nil
	default:
		return errors.New("invalid alert state")
	}
}

func (s *AlertState) Scan(value interface{}) error {
	v, ok := value.(string)
	if !ok {
		return errors.New("invalid alert state")
	}
	switch v {
	case "inactive":
		*s = StateInactive
	case "pending":
		*s = StatePending
	case "firing":
		*s = StateFiring
	case "nodata":
		*s = StateNoData
	case "disabled":
		*s = StateDisabled
	}
	return nil
}

func (s *AlertState) Value() (driver.Value, error) {
	return s.String(), nil
}

type LabelsString string

func (l *LabelsString) MarshalJSON() ([]byte, error) {
	lbls := make(map[string]string)
	err := json.Unmarshal([]byte(*l), &lbls)
	if err != nil {
		return nil, err
	}
	return json.Marshal(lbls)
}

func (l *LabelsString) Scan(src interface{}) error {
	if data, ok := src.(string); ok {
		*l = LabelsString(data)
	}
	return nil
}

func (l LabelsString) String() string {
	return string(l)
}

type RuleStateTimeline struct {
	Items  []RuleStateHistory  `json:"items"`
	Total  uint64              `json:"total"`
	Labels map[string][]string `json:"labels"`
}

type RuleStateHistory struct {
	RuleID   string `json:"ruleID" ch:"rule_id"`
	RuleName string `json:"ruleName" ch:"rule_name"`
	// One of ["normal", "firing"]
	OverallState        AlertState `json:"overallState" ch:"overall_state"`
	OverallStateChanged bool       `json:"overallStateChanged" ch:"overall_state_changed"`
	// One of ["normal", "firing", "no_data", "muted"]
	State        AlertState   `json:"state" ch:"state"`
	StateChanged bool         `json:"stateChanged" ch:"state_changed"`
	UnixMilli    int64        `json:"unixMilli" ch:"unix_milli"`
	Labels       LabelsString `json:"labels" ch:"labels"`
	Fingerprint  uint64       `json:"fingerprint" ch:"fingerprint"`
	Value        float64      `json:"value" ch:"value"`

	RelatedTracesLink string `json:"relatedTracesLink"`
	RelatedLogsLink   string `json:"relatedLogsLink"`
}

type QueryRuleStateHistory struct {
	Start   int64         `json:"start"`
	End     int64         `json:"end"`
	State   string        `json:"state"`
	Filters *v3.FilterSet `json:"filters"`
	Offset  int64         `json:"offset"`
	Limit   int64         `json:"limit"`
	Order   string        `json:"order"`
}

func (r *QueryRuleStateHistory) Validate() error {
	if r.Start == 0 || r.End == 0 {
		return fmt.Errorf("start and end are required")
	}
	if r.Offset < 0 || r.Limit < 0 {
		return fmt.Errorf("offset and limit must be greater than 0")
	}
	if r.Order != "asc" && r.Order != "desc" {
		return fmt.Errorf("order must be asc or desc")
	}
	return nil
}

type RuleStateHistoryContributor struct {
	Fingerprint       uint64       `json:"fingerprint" ch:"fingerprint"`
	Labels            LabelsString `json:"labels" ch:"labels"`
	Count             uint64       `json:"count" ch:"count"`
	RelatedTracesLink string       `json:"relatedTracesLink"`
	RelatedLogsLink   string       `json:"relatedLogsLink"`
}

type RuleStateTransition struct {
	RuleID         string     `json:"ruleID" ch:"rule_id"`
	State          AlertState `json:"state" ch:"state"`
	FiringTime     int64      `json:"firingTime" ch:"firing_time"`
	ResolutionTime int64      `json:"resolutionTime" ch:"resolution_time"`
}

type ReleStateItem struct {
	State AlertState `json:"state"`
	Start int64      `json:"start"`
	End   int64      `json:"end"`
}

type Stats struct {
	TotalCurrentTriggers           uint64     `json:"totalCurrentTriggers"`
	TotalPastTriggers              uint64     `json:"totalPastTriggers"`
	CurrentTriggersSeries          *v3.Series `json:"currentTriggersSeries"`
	PastTriggersSeries             *v3.Series `json:"pastTriggersSeries"`
	CurrentAvgResolutionTime       string     `json:"currentAvgResolutionTime"`
	PastAvgResolutionTime          string     `json:"pastAvgResolutionTime"`
	CurrentAvgResolutionTimeSeries *v3.Series `json:"currentAvgResolutionTimeSeries"`
	PastAvgResolutionTimeSeries    *v3.Series `json:"pastAvgResolutionTimeSeries"`
}
