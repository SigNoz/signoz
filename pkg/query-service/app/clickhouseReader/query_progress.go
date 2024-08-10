package clickhouseReader

import (
	"fmt"
	"sync"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
	"golang.org/x/exp/maps"
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

	tracker.queries[queryId] = NewQueryTracker()

	return func() {
		tracker.onQueryFinished(queryId)
	}, nil
}

func (tracker *InMemoryQueryProgressTracker) ReportQueryProgress(
	queryId string, chProgress *clickhouse.Progress,
) *model.ApiError {
	queryTracker, err := tracker.getQueryTracker(queryId)
	if err != nil {
		return err
	}

	queryTracker.progress.update(chProgress)
	latestState := queryTracker.progress.get()
	queryTracker.publisher.broadcast(latestState)
	return nil
}

func (tracker *InMemoryQueryProgressTracker) SubscribeToQueryProgress(
	queryId string,
) (<-chan QueryProgress, func(), *model.ApiError) {
	queryTracker, err := tracker.getQueryTracker(queryId)
	if err != nil {
		return nil, nil, err
	}

	latestProgress := queryTracker.progress.get()
	ch, unsubscribe := queryTracker.publisher.subscribe(latestProgress)

	return ch, unsubscribe, nil
}

func (tracker *InMemoryQueryProgressTracker) getQueryTracker(
	queryId string,
) (*QueryTracker, *model.ApiError) {
	tracker.lock.RLock()
	defer tracker.lock.RUnlock()

	queryTracker := tracker.queries[queryId]
	if queryTracker == nil {
		return nil, model.NotFoundError(fmt.Errorf(
			"query %s doesn't exist", queryId,
		))
	}

	return queryTracker, nil
}

func (tracker *InMemoryQueryProgressTracker) onQueryFinished(
	queryId string,
) {
	queryTracker, err := tracker.getQueryTracker(queryId)
	if err != nil {
		zap.L().Error("onQueryFinished", zap.Error(err))
	}

	queryTracker.onFinished()

	tracker.lock.Lock()
	delete(tracker.queries, queryId)
	tracker.lock.Unlock()
}

// Tracks progress and manages subscription for a single query
type QueryTracker struct {
	progress  QueryProgressState
	publisher *QueryProgressPublisher
}

func NewQueryTracker() *QueryTracker {
	return &QueryTracker{
		publisher: NewQueryProgressPublisher(),
	}
}

func (qt *QueryTracker) onFinished() {
	qt.publisher.onFinished()
}

// Concurrency safe QueryProgress state
type QueryProgressState struct {
	progress *QueryProgress
	lock     sync.RWMutex
}

func (qps *QueryProgressState) update(chProgress *clickhouse.Progress) {
	qps.lock.Lock()
	defer qps.lock.Unlock()

	if qps.progress == nil {
		// This is the first update
		qps.progress = &QueryProgress{}
	}

	qps.progress.update(chProgress)
}

// query progress will be nil before the 1st call to update
func (qps *QueryProgressState) get() *QueryProgress {
	qps.lock.RLock()
	defer qps.lock.RUnlock()

	return qps.progress
}

type QueryProgressPublisher struct {
	subscriptions map[string]*QueryProgressChannel
	lock          sync.RWMutex
}

func NewQueryProgressPublisher() *QueryProgressPublisher {
	return &QueryProgressPublisher{
		subscriptions: map[string]*QueryProgressChannel{},
	}
}

func (pub *QueryProgressPublisher) subscribe(latestProgress *QueryProgress) (
	<-chan QueryProgress, func(),
) {
	pub.lock.Lock()
	defer pub.lock.Unlock()

	subscriberId := uuid.NewString()
	ch := NewQueryProgressChannel()
	pub.subscriptions[subscriberId] = ch

	if latestProgress != nil {
		ch.send(*latestProgress)
	}

	return ch.ch, func() {
		pub.unsubscribe(subscriberId)
	}
}

func (pub *QueryProgressPublisher) unsubscribe(subscriberId string) {
	pub.lock.Lock()
	defer pub.lock.Unlock()

	ch := pub.subscriptions[subscriberId]
	if ch != nil {
		ch.close()
		delete(pub.subscriptions, subscriberId)
	}
}

func (pub *QueryProgressPublisher) broadcast(qp *QueryProgress) {
	if qp == nil {
		return
	}

	pub.lock.RLock()
	channels := maps.Values(pub.subscriptions)
	pub.lock.RUnlock()

	for _, ch := range channels {
		ch.send(*qp)
	}
}

func (pub *QueryProgressPublisher) onFinished() {
	pub.lock.RLock()
	channels := maps.Values(pub.subscriptions)
	pub.lock.RUnlock()

	for _, ch := range channels {
		ch.close()
	}

}

type QueryProgressChannel struct {
	ch chan QueryProgress

	isClosed bool
	lock     sync.Mutex
}

func NewQueryProgressChannel() *QueryProgressChannel {
	ch := make(chan QueryProgress, 1000)
	return &QueryProgressChannel{
		ch: ch,
	}
}

// Must not block or panic in any scenario
func (ch *QueryProgressChannel) send(progress QueryProgress) {
	ch.lock.Lock()
	defer ch.lock.Unlock()

	if ch.isClosed {
		zap.L().Error("can't send query progress: channel already closed.", zap.Any("progress", progress))
		return
	}

	// subscription channels are expected to have big enough buffers to ensure
	// blocking while sending doesn't happen in the happy path
	select {
	case ch.ch <- progress:
		zap.L().Debug("published query progess", zap.Any("progress", progress))
	default:
		zap.L().Error("couldn't publish query progess. dropping update.", zap.Any("progress", progress))
	}
}

func (ch *QueryProgressChannel) close() {
	ch.lock.Lock()
	defer ch.lock.Unlock()

	if !ch.isClosed {
		close(ch.ch)
		ch.isClosed = true
	}
}

// Helper for QueryProgress
func (qp *QueryProgress) update(chProgress *clickhouse.Progress) {

}
