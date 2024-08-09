package clickhouseReader

import (
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type QueryProgress struct {
	// Number of rows read till now.
	ReadRows uint64 `json:"read_rows"`

	TotalRowsToRead uint64 `json:"total_rows_to_read"`

	ReadBytes uint64 `json:"read_bytes"`

	ElapsedMs uint64 `json:"elapsed_ms"`
}

type QueryProgressTracker interface {
	// Tells the tracker that query with id `queryId` has started.
	// Progress can only be reported for and tracked for a query that is in progress.
	// Returns a cleanup function that must be called after the query finishes.
	ReportQueryStarted(queryId string) (postQueryCleanup func(), err *model.ApiError)

	// Report progress stats received from clickhouse for `queryId`
	ReportQueryProgress(queryId string, chProgress *clickhouse.Progress) *model.ApiError

	// Subscribe to progress updates for `queryId`
	// The returned channel will produce `QueryProgress` instances representing
	// the latest state of query progress stats.
	SubscribeToQueryProgress(queryId string) (<-chan QueryProgress, *model.ApiError)
}

func NewQueryProgressTracker() QueryProgressTracker {
	// InMemory tracker is useful only for single replica query service setups.
	// Multi replica setups must use a centralized store for tracking and subscribing to query progress
	return &InMemoryQueryProgressTracker{}
}

type InMemoryQueryProgressTracker struct {
}

func (tracker *InMemoryQueryProgressTracker) ReportQueryStarted(
	queryId string,
) (postQueryCleanup func(), err *model.ApiError) {
	return func() {}, nil
}

func (tracker *InMemoryQueryProgressTracker) ReportQueryProgress(
	queryId string, chProgress *clickhouse.Progress,
) *model.ApiError {
	return model.NotFoundError(fmt.Errorf(
		"query %s doesn't exist", queryId,
	))
}

func (tracker *InMemoryQueryProgressTracker) SubscribeToQueryProgress(
	queryId string,
) (<-chan QueryProgress, *model.ApiError) {
	return nil, model.NotFoundError(fmt.Errorf(
		"query %s doesn't exist", queryId,
	))

}
