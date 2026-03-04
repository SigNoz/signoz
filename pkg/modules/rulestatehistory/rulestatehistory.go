package rulestatehistory

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type Module interface {
	RecordRuleStateHistory(context.Context, string, bool, []rulestatehistorytypes.RuleStateHistory) error
	AddRuleStateHistory(context.Context, []rulestatehistorytypes.RuleStateHistory) error
	GetLastSavedRuleStateHistory(context.Context, string) ([]rulestatehistorytypes.RuleStateHistory, error)
	GetHistoryStats(context.Context, string, rulestatehistorytypes.Query) (rulestatehistorytypes.Stats, error)
	GetHistoryTimeline(context.Context, string, rulestatehistorytypes.Query) (*rulestatehistorytypes.RuleStateTimeline, error)
	GetHistoryFilterKeys(context.Context, string, rulestatehistorytypes.Query, string, int64) (*telemetrytypes.GettableFieldKeys, error)
	GetHistoryFilterValues(context.Context, string, string, rulestatehistorytypes.Query, string, int64) (*telemetrytypes.GettableFieldValues, error)
	GetHistoryContributors(context.Context, string, rulestatehistorytypes.Query) ([]rulestatehistorytypes.RuleStateHistoryContributor, error)
	GetHistoryOverallStatus(context.Context, string, rulestatehistorytypes.Query) ([]rulestatehistorytypes.RuleStateWindow, error)
}

type Handler interface {
	GetRuleHistoryStats(http.ResponseWriter, *http.Request)
	GetRuleHistoryTimeline(http.ResponseWriter, *http.Request)
	GetRuleHistoryFilterKeys(http.ResponseWriter, *http.Request)
	GetRuleHistoryFilterValues(http.ResponseWriter, *http.Request)
	GetRuleHistoryContributors(http.ResponseWriter, *http.Request)
	GetRuleHistoryOverallStatus(http.ResponseWriter, *http.Request)
}
