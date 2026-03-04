package rulestatehistorytypes

import (
	"context"
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type AlertState struct {
	valuer.String
}

var (
	StateInactive   = AlertState{valuer.NewString("inactive")}
	StatePending    = AlertState{valuer.NewString("pending")}
	StateRecovering = AlertState{valuer.NewString("recovering")}
	StateFiring     = AlertState{valuer.NewString("firing")}
	StateNoData     = AlertState{valuer.NewString("nodata")}
	StateDisabled   = AlertState{valuer.NewString("disabled")}
)

type LabelsString string

func (AlertState) Enum() []any {
	return []any{
		StateInactive,
		StatePending,
		StateRecovering,
		StateFiring,
		StateNoData,
		StateDisabled,
	}
}

func (s *AlertState) Scan(src any) error {
	if s == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "alert state scanner is nil")
	}

	switch value := src.(type) {
	case nil:
		s.String = valuer.NewString("")
	case string:
		s.String = valuer.NewString(value)
	case []byte:
		s.String = valuer.NewString(string(value))
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported alert state type")
	}

	return nil
}

func (s AlertState) Value() (driver.Value, error) {
	return s.StringValue(), nil
}

func (l *LabelsString) MarshalJSON() ([]byte, error) {
	lbls := make(map[string]string)
	if err := json.Unmarshal([]byte(*l), &lbls); err != nil {
		return nil, err
	}
	return json.Marshal(lbls)
}

func (l *LabelsString) Scan(src any) error {
	switch data := src.(type) {
	case nil:
		*l = ""
	case string:
		*l = LabelsString(data)
	case []byte:
		*l = LabelsString(string(data))
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported labels type")
	}
	return nil
}

func (l LabelsString) Value() (driver.Value, error) {
	return string(l), nil
}

type RuleStateHistory struct {
	RuleID   string `json:"ruleID" ch:"rule_id" required:"true"`
	RuleName string `json:"ruleName" ch:"rule_name" required:"true"`

	OverallState        AlertState `json:"overallState" ch:"overall_state" required:"true"`
	OverallStateChanged bool       `json:"overallStateChanged" ch:"overall_state_changed" required:"true"`

	State        AlertState   `json:"state" ch:"state" required:"true"`
	StateChanged bool         `json:"stateChanged" ch:"state_changed" required:"true"`
	UnixMilli    int64        `json:"unixMilli" ch:"unix_milli" required:"true"`
	Labels       LabelsString `json:"labels" ch:"labels" required:"true"`
	Fingerprint  uint64       `json:"fingerprint" ch:"fingerprint" required:"true"`
	Value        float64      `json:"value" ch:"value" required:"true"`
}

type Store interface {
	AddRuleStateHistory(ctx context.Context, entries []RuleStateHistory) error
	GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]RuleStateHistory, error)
	ReadRuleStateHistoryByRuleID(ctx context.Context, ruleID string, query *Query) (*RuleStateTimeline, error)
	ReadRuleStateHistoryFilterKeysByRuleID(ctx context.Context, ruleID string, query *Query, search string, limit int64) (*telemetrytypes.GettableFieldKeys, error)
	ReadRuleStateHistoryFilterValuesByRuleID(ctx context.Context, ruleID string, key string, query *Query, search string, limit int64) (*telemetrytypes.GettableFieldValues, error)
	ReadRuleStateHistoryTopContributorsByRuleID(ctx context.Context, ruleID string, query *Query) ([]RuleStateHistoryContributor, error)
	GetOverallStateTransitions(ctx context.Context, ruleID string, query *Query) ([]RuleStateWindow, error)
	GetTotalTriggers(ctx context.Context, ruleID string, query *Query) (uint64, error)
	GetTriggersByInterval(ctx context.Context, ruleID string, query *Query) (*qbtypes.TimeSeries, error)
	GetAvgResolutionTime(ctx context.Context, ruleID string, query *Query) (float64, error)
	GetAvgResolutionTimeByInterval(ctx context.Context, ruleID string, query *Query) (*qbtypes.TimeSeries, error)
}
