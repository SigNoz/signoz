package queryprogress

import (
	"fmt"
	"log/slog"
	"sync"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/google/uuid"
	"golang.org/x/exp/maps"
)

// tracks progress and manages subscriptions for all queries
type inMemoryQueryProgressTracker struct {
	logger  *slog.Logger
	queries map[string]*queryTracker
	lock    sync.RWMutex
}

func (tracker *inMemoryQueryProgressTracker) ReportQueryStarted(
	queryId string,
) (postQueryCleanup func(), apiErr *model.ApiError) {
	tracker.lock.Lock()
	defer tracker.lock.Unlock()

	_, exists := tracker.queries[queryId]
	if exists {
		return nil, model.BadRequest(fmt.Errorf(
			"query %s already started", queryId,
		))
	}

	tracker.queries[queryId] = newQueryTracker(tracker.logger, queryId)

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
	logger     *slog.Logger
	queryId    string
	isFinished bool

	progress      *model.QueryProgress
	subscriptions map[string]*queryProgressSubscription

	lock sync.Mutex
}

func newQueryTracker(logger *slog.Logger, queryId string) *queryTracker {
	return &queryTracker{
		logger:        logger,
		queryId:       queryId,
		subscriptions: map[string]*queryProgressSubscription{},
	}
}

func (qt *queryTracker) handleProgressUpdate(p *clickhouse.Progress) {
	qt.lock.Lock()
	defer qt.lock.Unlock()

	if qt.isFinished {
		qt.logger.Warn("received clickhouse progress update for finished query", "queryId", qt.queryId, "progress", p)
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
	subscription := newQueryProgressSubscription(qt.logger)
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
		qt.logger.Debug("received unsubscribe request after query finished", "subscriber", subscriberId, "queryId", qt.queryId)
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
		qt.logger.Warn("receiver query finish report after query finished", "queryId", qt.queryId)
		return
	}

	for subId, sub := range qt.subscriptions {
		sub.close()
		delete(qt.subscriptions, subId)
	}

	qt.isFinished = true
}

type queryProgressSubscription struct {
	logger   *slog.Logger
	ch       chan model.QueryProgress
	isClosed bool
	lock     sync.Mutex
}

func newQueryProgressSubscription(logger *slog.Logger) *queryProgressSubscription {
	ch := make(chan model.QueryProgress, 1000)
	return &queryProgressSubscription{
		logger: logger,
		ch:     ch,
	}
}

// Must not block or panic in any scenario
func (ch *queryProgressSubscription) send(progress model.QueryProgress) {
	ch.lock.Lock()
	defer ch.lock.Unlock()

	if ch.isClosed {
		ch.logger.Error("can't send query progress: channel already closed.", "progress", progress)
		return
	}

	// subscription channels are expected to have big enough buffers to ensure
	// blocking while sending doesn't happen in the happy path
	select {
	case ch.ch <- progress:
		ch.logger.Debug("published query progress", "progress", progress)
	default:
		ch.logger.Error("couldn't publish query progress. dropping update.", "progress", progress)
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
