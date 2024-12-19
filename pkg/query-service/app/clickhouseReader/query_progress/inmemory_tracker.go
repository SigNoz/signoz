package queryprogress

import (
	"fmt"
	"sync"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"go.signoz.io/signoz/pkg/query-service/model"
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

	tracker.queries[queryId] = newQueryTracker(queryId)

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
) (<-chan model.QueryProgress, func(), *model.ApiError) {
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
	queryId    string
	isFinished bool

	progress      *model.QueryProgress
	subscriptions map[string]*queryProgressSubscription

	lock sync.Mutex
}

func newQueryTracker(queryId string) *queryTracker {
	return &queryTracker{
		queryId:       queryId,
		subscriptions: map[string]*queryProgressSubscription{},
	}
}

func (qt *queryTracker) handleProgressUpdate(p *clickhouse.Progress) {
	qt.lock.Lock()
	defer qt.lock.Unlock()

	if qt.isFinished {
		zap.L().Warn(
			"received clickhouse progress update for finished query",
			zap.String("queryId", qt.queryId), zap.Any("progress", p),
		)
		return
	}

	if qt.progress == nil {
		// This is the first update
		qt.progress = &model.QueryProgress{}
	}
	updateQueryProgress(qt.progress, p)

	// broadcast latest state to all subscribers.
	for _, sub := range maps.Values(qt.subscriptions) {
		sub.send(*qt.progress)
	}
}

func (qt *queryTracker) subscribe() (
	<-chan model.QueryProgress, func(), *model.ApiError,
) {
	qt.lock.Lock()
	defer qt.lock.Unlock()

	if qt.isFinished {
		return nil, nil, model.NotFoundError(fmt.Errorf(
			"query %s already finished", qt.queryId,
		))
	}

	subscriberId := uuid.NewString()
	subscription := newQueryProgressSubscription()
	qt.subscriptions[subscriberId] = subscription

	if qt.progress != nil {
		subscription.send(*qt.progress)
	}

	return subscription.ch, func() {
		qt.unsubscribe(subscriberId)
	}, nil
}

func (qt *queryTracker) unsubscribe(subscriberId string) {
	qt.lock.Lock()
	defer qt.lock.Unlock()

	if qt.isFinished {
		zap.L().Debug(
			"received unsubscribe request after query finished",
			zap.String("subscriber", subscriberId),
			zap.String("queryId", qt.queryId),
		)
		return
	}

	subscription := qt.subscriptions[subscriberId]
	if subscription != nil {
		subscription.close()
		delete(qt.subscriptions, subscriberId)
	}
}

func (qt *queryTracker) onFinished() {
	qt.lock.Lock()
	defer qt.lock.Unlock()

	if qt.isFinished {
		zap.L().Warn(
			"receiver query finish report after query finished",
			zap.String("queryId", qt.queryId),
		)
		return
	}

	for subId, sub := range qt.subscriptions {
		sub.close()
		delete(qt.subscriptions, subId)
	}

	qt.isFinished = true
}

type queryProgressSubscription struct {
	ch       chan model.QueryProgress
	isClosed bool
	lock     sync.Mutex
}

func newQueryProgressSubscription() *queryProgressSubscription {
	ch := make(chan model.QueryProgress, 1000)
	return &queryProgressSubscription{
		ch: ch,
	}
}

// Must not block or panic in any scenario
func (ch *queryProgressSubscription) send(progress model.QueryProgress) {
	ch.lock.Lock()
	defer ch.lock.Unlock()

	if ch.isClosed {
		zap.L().Error(
			"can't send query progress: channel already closed.",
			zap.Any("progress", progress),
		)
		return
	}

	// subscription channels are expected to have big enough buffers to ensure
	// blocking while sending doesn't happen in the happy path
	select {
	case ch.ch <- progress:
		zap.L().Debug("published query progress", zap.Any("progress", progress))
	default:
		zap.L().Error(
			"couldn't publish query progress. dropping update.",
			zap.Any("progress", progress),
		)
	}
}

func (ch *queryProgressSubscription) close() {
	ch.lock.Lock()
	defer ch.lock.Unlock()

	if !ch.isClosed {
		close(ch.ch)
		ch.isClosed = true
	}
}

func updateQueryProgress(qp *model.QueryProgress, chProgress *clickhouse.Progress) {
	qp.ReadRows += chProgress.Rows
	qp.ReadBytes += chProgress.Bytes
	qp.ElapsedMs += uint64(chProgress.Elapsed.Milliseconds())
}
