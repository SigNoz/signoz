package queryprogress

import (
	"fmt"
	"sync"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
	"golang.org/x/exp/maps"
)

// tracks progress and manages subscriptions for all queries
type inMemoryQueryProgressTracker struct {
	queries map[string]*queryTracker
	lock    sync.RWMutex
}

func (tracker *inMemoryQueryProgressTracker) ReportQueryStarted(
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

	tracker.queries[queryId] = newQueryTracker()

	return func() {
		tracker.onQueryFinished(queryId)
	}, nil
}

func (tracker *inMemoryQueryProgressTracker) ReportQueryProgress(
	queryId string, chProgress *clickhouse.Progress,
) *model.ApiError {
	queryTracker, err := tracker.getQueryTracker(queryId)
	if err != nil {
		return err
	}

	queryTracker.handleProgressUpdate(chProgress)
	return nil
}

func (tracker *inMemoryQueryProgressTracker) SubscribeToQueryProgress(
	queryId string,
) (<-chan v3.QueryProgress, func(), *model.ApiError) {
	queryTracker, err := tracker.getQueryTracker(queryId)
	if err != nil {
		return nil, nil, err
	}

	return queryTracker.subscribe()
}

func (tracker *inMemoryQueryProgressTracker) onQueryFinished(
	queryId string,
) {
	tracker.lock.Lock()
	queryTracker := tracker.queries[queryId]
	if queryTracker != nil {
		delete(tracker.queries, queryId)
	}
	tracker.lock.Unlock()

	if queryTracker != nil {
		queryTracker.onFinished()
	}
}

func (tracker *inMemoryQueryProgressTracker) getQueryTracker(
	queryId string,
) (*queryTracker, *model.ApiError) {
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

// Tracks progress and manages subscriptions for a single query
type queryTracker struct {
	progress  queryProgressState
	publisher *queryProgressPublisher
}

func newQueryTracker() *queryTracker {
	return &queryTracker{
		publisher: newQueryProgressPublisher(),
	}
}

func (qt *queryTracker) handleProgressUpdate(p *clickhouse.Progress) {
	qt.progress.update(p)
	latestState := qt.progress.get()
	qt.publisher.broadcast(latestState)
}

func (qt *queryTracker) subscribe() (
	<-chan v3.QueryProgress, func(), *model.ApiError,
) {
	latestProgress := qt.progress.get()
	ch, unsubscribe := qt.publisher.subscribe(latestProgress)
	return ch, unsubscribe, nil
}

func (qt *queryTracker) onFinished() {
	qt.publisher.onFinished()
}

// Concurrency safe QueryProgress state
type queryProgressState struct {
	progress *v3.QueryProgress
	lock     sync.RWMutex
}

func (qps *queryProgressState) update(chProgress *clickhouse.Progress) {
	qps.lock.Lock()
	defer qps.lock.Unlock()

	if qps.progress == nil {
		// This is the first update
		qps.progress = &v3.QueryProgress{}
	}

	updateQueryProgress(qps.progress, chProgress)
}

func updateQueryProgress(qp *v3.QueryProgress, chProgress *clickhouse.Progress) {
	qp.ReadRows += chProgress.Rows
	qp.ReadBytes += chProgress.Bytes
	qp.ElapsedMs += uint64(chProgress.Elapsed.Milliseconds())
}

// query progress will be nil before the 1st call to update
func (qps *queryProgressState) get() *v3.QueryProgress {
	qps.lock.RLock()
	defer qps.lock.RUnlock()

	return qps.progress
}

type queryProgressPublisher struct {
	subscriptions map[string]*queryProgressChannel
	lock          sync.RWMutex
}

func newQueryProgressPublisher() *queryProgressPublisher {
	return &queryProgressPublisher{
		subscriptions: map[string]*queryProgressChannel{},
	}
}

func (pub *queryProgressPublisher) subscribe(
	latestProgress *v3.QueryProgress,
) (<-chan v3.QueryProgress, func()) {
	pub.lock.Lock()
	defer pub.lock.Unlock()

	subscriberId := uuid.NewString()
	ch := newQueryProgressChannel()
	pub.subscriptions[subscriberId] = ch

	if latestProgress != nil {
		ch.send(*latestProgress)
	}

	return ch.ch, func() {
		pub.unsubscribe(subscriberId)
	}
}

func (pub *queryProgressPublisher) unsubscribe(subscriberId string) {
	pub.lock.Lock()
	defer pub.lock.Unlock()

	ch := pub.subscriptions[subscriberId]
	if ch != nil {
		ch.close()
		delete(pub.subscriptions, subscriberId)
	}
}

func (pub *queryProgressPublisher) broadcast(qp *v3.QueryProgress) {
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

func (pub *queryProgressPublisher) onFinished() {
	pub.lock.RLock()
	channels := maps.Values(pub.subscriptions)
	pub.lock.RUnlock()

	for _, ch := range channels {
		ch.close()
	}

}

type queryProgressChannel struct {
	ch chan v3.QueryProgress

	isClosed bool
	lock     sync.Mutex
}

func newQueryProgressChannel() *queryProgressChannel {
	ch := make(chan v3.QueryProgress, 1000)
	return &queryProgressChannel{
		ch: ch,
	}
}

// Must not block or panic in any scenario
func (ch *queryProgressChannel) send(progress v3.QueryProgress) {
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

func (ch *queryProgressChannel) close() {
	ch.lock.Lock()
	defer ch.lock.Unlock()

	if !ch.isClosed {
		close(ch.ch)
		ch.isClosed = true
	}
}
