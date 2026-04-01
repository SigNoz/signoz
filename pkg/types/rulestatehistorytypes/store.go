package rulestatehistorytypes

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type LabelsString string

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

func (l LabelsString) ToQBLabels() []*qbtypes.Label {
	if strings.TrimSpace(string(l)) == "" {
		return []*qbtypes.Label{}
	}

	labelsMap := map[string]any{}
	if err := json.Unmarshal([]byte(l), &labelsMap); err != nil {
		return []*qbtypes.Label{}
	}

	keys := make([]string, 0, len(labelsMap))
	for key := range labelsMap {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	labels := make([]*qbtypes.Label, 0, len(keys))
	for _, key := range keys {
		labels = append(labels, &qbtypes.Label{
			Key: telemetrytypes.TelemetryFieldKey{
				Name: key,
			},
			Value: labelsMap[key],
		})
	}

	return labels
}

type RuleStateHistory struct {
	RuleID   string `ch:"rule_id"`
	RuleName string `ch:"rule_name"`

	OverallState        ruletypes.AlertState `ch:"overall_state"`
	OverallStateChanged bool                 `ch:"overall_state_changed"`

	State        ruletypes.AlertState `ch:"state"`
	StateChanged bool                 `ch:"state_changed"`
	UnixMilli    int64                `ch:"unix_milli"`
	Labels       LabelsString         `ch:"labels"`
	Fingerprint  uint64               `ch:"fingerprint"`
	Value        float64              `ch:"value"`
}

type RuleStateHistoryContributor struct {
	Fingerprint       uint64       `ch:"fingerprint"`
	Labels            LabelsString `ch:"labels"`
	Count             uint64       `ch:"count"`
	RelatedTracesLink string
	RelatedLogsLink   string
}

type Store interface {
	AddRuleStateHistory(ctx context.Context, entries []RuleStateHistory) error
	GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]RuleStateHistory, error)
	ReadRuleStateHistoryByRuleID(ctx context.Context, ruleID string, query *Query) ([]RuleStateHistory, uint64, error)
	ReadRuleStateHistoryFilterKeysByRuleID(ctx context.Context, ruleID string, query *Query, search string, limit int64) (*telemetrytypes.GettableFieldKeys, error)
	ReadRuleStateHistoryFilterValuesByRuleID(ctx context.Context, ruleID string, key string, query *Query, search string, limit int64) (*telemetrytypes.GettableFieldValues, error)
	ReadRuleStateHistoryTopContributorsByRuleID(ctx context.Context, ruleID string, query *Query) ([]RuleStateHistoryContributor, error)
	GetOverallStateTransitions(ctx context.Context, ruleID string, query *Query) ([]GettableRuleStateWindow, error)
	GetTotalTriggers(ctx context.Context, ruleID string, query *Query) (uint64, error)
	GetTriggersByInterval(ctx context.Context, ruleID string, query *Query) (*qbtypes.TimeSeries, error)
	GetAvgResolutionTime(ctx context.Context, ruleID string, query *Query) (float64, error)
	GetAvgResolutionTimeByInterval(ctx context.Context, ruleID string, query *Query) (*qbtypes.TimeSeries, error)
}
