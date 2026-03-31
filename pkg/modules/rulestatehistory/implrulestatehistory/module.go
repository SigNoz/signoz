package implrulestatehistory

import (
	"context"
	"math"
	"time"

	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type module struct {
	store rulestatehistorytypes.Store
}

func NewModule(store rulestatehistorytypes.Store) rulestatehistory.Module {
	return &module{store: store}
}

func (m *module) GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]rulestatehistorytypes.RuleStateHistory, error) {
	return m.store.GetLastSavedRuleStateHistory(ctx, ruleID)
}

func (m *module) GetHistoryTimeline(ctx context.Context, ruleID string, query rulestatehistorytypes.Query) ([]rulestatehistorytypes.RuleStateHistory, uint64, error) {
	return m.store.ReadRuleStateHistoryByRuleID(ctx, ruleID, &query)
}

func (m *module) GetHistoryFilterKeys(ctx context.Context, ruleID string, query rulestatehistorytypes.Query, search string, limit int64) (*telemetrytypes.GettableFieldKeys, error) {
	return m.store.ReadRuleStateHistoryFilterKeysByRuleID(ctx, ruleID, &query, search, limit)
}

func (m *module) GetHistoryFilterValues(ctx context.Context, ruleID string, key string, query rulestatehistorytypes.Query, search string, limit int64) (*telemetrytypes.GettableFieldValues, error) {
	return m.store.ReadRuleStateHistoryFilterValuesByRuleID(ctx, ruleID, key, &query, search, limit)
}

func (m *module) GetHistoryContributors(ctx context.Context, ruleID string, query rulestatehistorytypes.Query) ([]rulestatehistorytypes.RuleStateHistoryContributor, error) {
	return m.store.ReadRuleStateHistoryTopContributorsByRuleID(ctx, ruleID, &query)
}

func (m *module) GetHistoryOverallStatus(ctx context.Context, ruleID string, query rulestatehistorytypes.Query) ([]rulestatehistorytypes.GettableRuleStateWindow, error) {
	return m.store.GetOverallStateTransitions(ctx, ruleID, &query)
}

func (m *module) GetHistoryStats(ctx context.Context, ruleID string, params rulestatehistorytypes.Query) (rulestatehistorytypes.GettableRuleStateHistoryStats, error) {
	totalCurrentTriggers, err := m.store.GetTotalTriggers(ctx, ruleID, &params)
	if err != nil {
		return rulestatehistorytypes.GettableRuleStateHistoryStats{}, err
	}
	currentTriggersSeries, err := m.store.GetTriggersByInterval(ctx, ruleID, &params)
	if err != nil {
		return rulestatehistorytypes.GettableRuleStateHistoryStats{}, err
	}
	currentAvgResolutionTime, err := m.store.GetAvgResolutionTime(ctx, ruleID, &params)
	if err != nil {
		return rulestatehistorytypes.GettableRuleStateHistoryStats{}, err
	}
	currentAvgResolutionTimeSeries, err := m.store.GetAvgResolutionTimeByInterval(ctx, ruleID, &params)
	if err != nil {
		return rulestatehistorytypes.GettableRuleStateHistoryStats{}, err
	}

	if params.End-params.Start >= 86400000 {
		days := int64(math.Ceil(float64(params.End-params.Start) / 86400000))
		params.Start -= days * 86400000
		params.End -= days * 86400000
	} else {
		params.Start -= 86400000
		params.End -= 86400000
	}

	totalPastTriggers, err := m.store.GetTotalTriggers(ctx, ruleID, &params)
	if err != nil {
		return rulestatehistorytypes.GettableRuleStateHistoryStats{}, err
	}
	pastTriggersSeries, err := m.store.GetTriggersByInterval(ctx, ruleID, &params)
	if err != nil {
		return rulestatehistorytypes.GettableRuleStateHistoryStats{}, err
	}
	pastAvgResolutionTime, err := m.store.GetAvgResolutionTime(ctx, ruleID, &params)
	if err != nil {
		return rulestatehistorytypes.GettableRuleStateHistoryStats{}, err
	}
	pastAvgResolutionTimeSeries, err := m.store.GetAvgResolutionTimeByInterval(ctx, ruleID, &params)
	if err != nil {
		return rulestatehistorytypes.GettableRuleStateHistoryStats{}, err
	}

	if math.IsNaN(currentAvgResolutionTime) || math.IsInf(currentAvgResolutionTime, 0) {
		currentAvgResolutionTime = 0
	}
	if math.IsNaN(pastAvgResolutionTime) || math.IsInf(pastAvgResolutionTime, 0) {
		pastAvgResolutionTime = 0
	}

	return rulestatehistorytypes.GettableRuleStateHistoryStats{
		TotalCurrentTriggers:           totalCurrentTriggers,
		TotalPastTriggers:              totalPastTriggers,
		CurrentTriggersSeries:          currentTriggersSeries,
		PastTriggersSeries:             pastTriggersSeries,
		CurrentAvgResolutionTime:       currentAvgResolutionTime,
		PastAvgResolutionTime:          pastAvgResolutionTime,
		CurrentAvgResolutionTimeSeries: currentAvgResolutionTimeSeries,
		PastAvgResolutionTimeSeries:    pastAvgResolutionTimeSeries,
	}, nil
}

func (m *module) RecordRuleStateHistory(ctx context.Context, ruleID string, handledRestart bool, itemsToAdd []rulestatehistorytypes.RuleStateHistory) error {
	revisedItemsToAdd := map[uint64]rulestatehistorytypes.RuleStateHistory{}

	lastSavedState, err := m.store.GetLastSavedRuleStateHistory(ctx, ruleID)
	if err != nil {
		return err
	}

	if !handledRestart && len(lastSavedState) > 0 {
		currentItemsByFingerprint := make(map[uint64]rulestatehistorytypes.RuleStateHistory, len(itemsToAdd))
		for _, item := range itemsToAdd {
			currentItemsByFingerprint[item.Fingerprint] = item
		}

		shouldSkip := map[uint64]bool{}
		for _, item := range lastSavedState {
			currentState, ok := currentItemsByFingerprint[item.Fingerprint]
			if !ok {
				if item.State == rulestatehistorytypes.StateFiring || item.State == rulestatehistorytypes.StateNoData {
					item.State = rulestatehistorytypes.StateInactive
					item.StateChanged = true
					item.UnixMilli = time.Now().UnixMilli()
					revisedItemsToAdd[item.Fingerprint] = item
				}
			} else if item.State != currentState.State {
				item.State = currentState.State
				item.StateChanged = true
				item.UnixMilli = time.Now().UnixMilli()
				revisedItemsToAdd[item.Fingerprint] = item
			}

			shouldSkip[item.Fingerprint] = true
		}

		for _, item := range itemsToAdd {
			if _, ok := revisedItemsToAdd[item.Fingerprint]; !ok && !shouldSkip[item.Fingerprint] {
				revisedItemsToAdd[item.Fingerprint] = item
			}
		}

		newState := rulestatehistorytypes.StateInactive
		for _, item := range revisedItemsToAdd {
			if item.State == rulestatehistorytypes.StateFiring || item.State == rulestatehistorytypes.StateNoData {
				newState = rulestatehistorytypes.StateFiring
				break
			}
		}

		if lastSavedState[0].OverallState != newState {
			for fingerprint, item := range revisedItemsToAdd {
				item.OverallState = newState
				item.OverallStateChanged = true
				revisedItemsToAdd[fingerprint] = item
			}
		}
	} else {
		for _, item := range itemsToAdd {
			revisedItemsToAdd[item.Fingerprint] = item
		}
	}

	if len(revisedItemsToAdd) == 0 {
		return nil
	}

	entries := make([]rulestatehistorytypes.RuleStateHistory, 0, len(revisedItemsToAdd))
	for _, item := range revisedItemsToAdd {
		entries = append(entries, item)
	}

	return m.store.AddRuleStateHistory(ctx, entries)
}
