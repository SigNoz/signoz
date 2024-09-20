package queryprogress

import (
	"github.com/ClickHouse/clickhouse-go/v2"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type QueryProgressTracker interface {
	// Tells the tracker that query with id `queryId` has started.
	// Progress can only be reported for and tracked for a query that is in progress.
	// Returns a cleanup function that must be called after the query finishes.
	ReportQueryStarted(queryId string) (postQueryCleanup func(), err *model.ApiError)

	// Report progress stats received from clickhouse for `queryId`
	ReportQueryProgress(queryId string, chProgress *clickhouse.Progress) *model.ApiError

	// Subscribe to progress updates for `queryId`
	// The returned channel will produce `QueryProgress` instances representing
	// the latest state of query progress stats. Also returns a function that
	// can be called to unsubscribe before the query finishes, if needed.
	SubscribeToQueryProgress(queryId string) (ch <-chan model.QueryProgress, unsubscribe func(), err *model.ApiError)
}

func NewQueryProgressTracker() QueryProgressTracker {
	// InMemory tracker is useful only for single replica query service setups.
	// Multi replica setups must use a centralized store for tracking and subscribing to query progress
	return &inMemoryQueryProgressTracker{
		queries: map[string]*queryTracker{},
	}
}
