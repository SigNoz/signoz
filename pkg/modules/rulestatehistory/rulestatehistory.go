package rulestatehistory

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// Module defines the core operations for managing rule state history.
type Module interface {
	// RecordRuleStateHistory persists a batch of rule state history entries for a given rule.
	// The bool parameter indicates whether restart is handled.
	// TODO(srikanthccv): remove when rule state history record moved to AM
	RecordRuleStateHistory(context.Context, string, bool, []rulestatehistorytypes.RuleStateHistory) error

	// GetLastSavedRuleStateHistory retrieves the most recently saved state history entries for a given rule.
	GetLastSavedRuleStateHistory(context.Context, string) ([]rulestatehistorytypes.RuleStateHistory, error)

	// GetHistoryStats returns aggregated statistics for rule state history matching the given query.
	GetHistoryStats(context.Context, string, rulestatehistorytypes.Query) (rulestatehistorytypes.GettableRuleStateHistoryStats, error)

	// GetHistoryTimeline returns a time-ordered list of rule state history entries and a total count
	// for the given query, suitable for paginated timeline views.
	GetHistoryTimeline(context.Context, string, rulestatehistorytypes.Query) ([]rulestatehistorytypes.RuleStateHistory, uint64, error)

	// GetHistoryFilterKeys returns the available filter keys for rule state history queries.
	GetHistoryFilterKeys(context.Context, string, rulestatehistorytypes.Query, string, int64) (*telemetrytypes.GettableFieldKeys, error)

	// GetHistoryFilterValues returns the available values for a specific filter key in rule state history.
	GetHistoryFilterValues(context.Context, string, string, rulestatehistorytypes.Query, string, int64) (*telemetrytypes.GettableFieldValues, error)

	// GetHistoryContributors returns the top contributors to trigger alert, for the given query.
	GetHistoryContributors(context.Context, string, rulestatehistorytypes.Query) ([]rulestatehistorytypes.RuleStateHistoryContributor, error)

	// GetHistoryOverallStatus returns the overall status windows for rule state history,
	// providing an aggregated view of rule health over time.
	GetHistoryOverallStatus(context.Context, string, rulestatehistorytypes.Query) ([]rulestatehistorytypes.GettableRuleStateWindow, error)
}

// Handler defines the HTTP handler methods for rule state history API endpoints.
type Handler interface {
	// GetRuleHistoryStats handles requests for aggregated rule state history statistics.
	GetRuleHistoryStats(http.ResponseWriter, *http.Request)

	// GetRuleHistoryTimeline handles requests for a paginated timeline of rule state changes.
	GetRuleHistoryTimeline(http.ResponseWriter, *http.Request)

	// GetRuleHistoryFilterKeys handles requests for available filter keys in rule state history.
	GetRuleHistoryFilterKeys(http.ResponseWriter, *http.Request)

	// GetRuleHistoryFilterValues handles requests for available values of a specific filter key.
	GetRuleHistoryFilterValues(http.ResponseWriter, *http.Request)

	// GetRuleHistoryContributors handles requests for top contributors to alert trigger.
	GetRuleHistoryContributors(http.ResponseWriter, *http.Request)

	// GetRuleHistoryOverallStatus handles requests for the overall status view of rule health over time.
	GetRuleHistoryOverallStatus(http.ResponseWriter, *http.Request)
}
