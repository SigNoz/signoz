package alertmanagerbatcher

import (
	"context"
	"log/slog"

	"sync"

	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

// Notifier is responsible for dispatching alert notifications to an alertmanager.
type Batcher struct {
	// logger
	logger *slog.Logger

	// queue of alerts to be sent to alertmanager
	queue alertmanagertypes.PostableAlerts

	// config
	config Config

	// more channel to signal the sender goroutine to send alerts
	more      chan struct{}
	mtx       sync.RWMutex
	batchChan chan alertmanagertypes.PostableAlerts
}

func New(logger *slog.Logger, config Config) *Batcher {
	batcher := &Batcher{
		logger:    logger,
		queue:     make(alertmanagertypes.PostableAlerts, config.Capacity),
		config:    config,
		more:      make(chan struct{}, 1),
		batchChan: make(chan alertmanagertypes.PostableAlerts, config.Size),
	}

	return batcher
}

// Start dispatches notifications continuously.
func (n *Batcher) Start(ctx context.Context) error {
	n.logger.InfoContext(ctx, "starting alertmanager batcher")
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-n.more:
		}
		alerts := n.nextBatch()
		n.batchChan <- alerts
		// If the queue still has items left, kick off the next iteration.
		if n.queueLen() > 0 {
			n.setMore()
		}
	}
}

func (n *Batcher) C(ctx context.Context) chan alertmanagertypes.PostableAlerts {
	return n.batchChan
}

func (n *Batcher) queueLen() int {
	n.mtx.RLock()
	defer n.mtx.RUnlock()

	return len(n.queue)
}

func (n *Batcher) nextBatch() alertmanagertypes.PostableAlerts {
	n.mtx.Lock()
	defer n.mtx.Unlock()

	var alerts alertmanagertypes.PostableAlerts

	if len(n.queue) > n.config.Size {
		alerts = append(make(alertmanagertypes.PostableAlerts, 0, n.config.Size), n.queue[:n.config.Size]...)
		n.queue = n.queue[n.config.Size:]
	} else {
		alerts = append(make(alertmanagertypes.PostableAlerts, 0, len(n.queue)), n.queue...)
		n.queue = n.queue[:0]
	}

	return alerts
}

// Send queues the given notification requests for processing.
// Panics if called on a handler that is not running.
func (n *Batcher) Send(ctx context.Context, alerts ...*alertmanagertypes.PostableAlert) {
	n.mtx.Lock()
	defer n.mtx.Unlock()

	// Queue capacity should be significantly larger than a single alert
	// batch could be.
	if d := len(alerts) - n.config.Capacity; d > 0 {
		alerts = alerts[d:]
		n.logger.WarnContext(ctx, "Alert batch larger than queue capacity, dropping alerts", "num_dropped", d)
	}

	// If the queue is full, remove the oldest alerts in favor
	// of newer ones.
	if d := (len(n.queue) + len(alerts)) - n.config.Capacity; d > 0 {
		n.queue = n.queue[d:]

		n.logger.WarnContext(ctx, "Alert notification queue full, dropping alerts", "num_dropped", d)
	}
	n.queue = append(n.queue, alerts...)

	// Notify sending goroutine that there are alerts to be processed.
	n.setMore()
}

// setMore signals that the alert queue has items.
func (n *Batcher) setMore() {
	// If we cannot send on the channel, it means the signal already exists
	// and has not been consumed yet.
	select {
	case n.more <- struct{}{}:
	default:
	}
}

// Stop shuts down the notification handler.
func (n *Batcher) Stop(ctx context.Context) error {
	n.logger.InfoContext(ctx, "Stopping alertmanager batcher")
	close(n.more)
	close(n.batchChan)
	return nil
}
