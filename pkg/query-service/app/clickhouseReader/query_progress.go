package clickhouseReader

import (
	"fmt"
	"sync"

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
	// Also returns a function that can be called to unsubscribe before query finished if needed.
	SubscribeToQueryProgress(queryId string) (ch <-chan QueryProgress, unsubscribe func(), err *model.ApiError)
}

func NewQueryProgressTracker() QueryProgressTracker {
	// InMemory tracker is useful only for single replica query service setups.
	// Multi replica setups must use a centralized store for tracking and subscribing to query progress
	return &InMemoryQueryProgressTracker{
		queries: map[string]*QueryTracker{},
	}
}

type InMemoryQueryProgressTracker struct {
	queries map[string]*QueryTracker
	lock    sync.RWMutex
}

func (tracker *InMemoryQueryProgressTracker) ReportQueryStarted(
	queryId string,
) (postQueryCleanup func(), err *model.ApiError) {
	tracker.lock.Lock()
	defer tracker.lock.Unlock()

	_, exists := tracker.queries[queryId]
	if exists {
		return nil, model.BadRequest(fmt.Errorf(
			"query %s already started", queryId,
		))
	}

	tracker.queries[queryId] = &QueryTracker{}

	return func() {}, nil
}

func (tracker *InMemoryQueryProgressTracker) ReportQueryProgress(
	queryId string, chProgress *clickhouse.Progress,
) *model.ApiError {
	tracker.lock.RLock()
	defer tracker.lock.RUnlock()

	queryTracker := tracker.queries[queryId]
	if queryTracker == nil {
		return model.NotFoundError(fmt.Errorf(
			"query %s doesn't exist", queryId,
		))
	}

	queryTracker.ReportProgress(chProgress)
	return nil
}

func (tracker *InMemoryQueryProgressTracker) SubscribeToQueryProgress(
	queryId string,
) (<-chan QueryProgress, func(), *model.ApiError) {
	tracker.lock.RLock()
	defer tracker.lock.RUnlock()

	queryTracker := tracker.queries[queryId]
	if queryTracker == nil {
		return nil, nil, model.NotFoundError(fmt.Errorf(
			"query %s doesn't exist", queryId,
		))
	}

	return queryTracker.Subscribe()
}

// Tracks progress and manages subscription for a single query
type QueryTracker struct {
	progress QueryProgressState
}

func (qt *QueryTracker) ReportProgress(chProgress *clickhouse.Progress) {
	qt.progress.update(chProgress)
}

func (qt *QueryTracker) Subscribe() (
	<-chan QueryProgress, func(), *model.ApiError,
) {

	return nil, nil, model.InternalError(fmt.Errorf("not implemented yet"))
}

// Concurrency safe QueryProgress state
type QueryProgressState struct {
	progress QueryProgress
	lock     sync.RWMutex
}

func (qps *QueryProgressState) update(chProgress *clickhouse.Progress) {
	qps.lock.Lock()
	defer qps.lock.Unlock()

	qps.progress.update(chProgress)
}

// Helper for QueryProgress
func (qp *QueryProgress) update(chProgress *clickhouse.Progress) {

}
