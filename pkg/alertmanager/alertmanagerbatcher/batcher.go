package alertmanagerbatcher

import (
	"context"
	"log/slog"

	"sync"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

// Batcher is responsible for batching alerts and broadcasting them on a channel.
type Batcher struct {
	// C is the channel on which alerts are sent to alertmanager
	C chan alertmanagertypes.PostableAlerts

	// logger
	logger *slog.Logger

	// queue of alerts to be sent to alertmanager
	queue alertmanagertypes.PostableAlerts

	// config
	config Config

	// more channel to signal the sender goroutine to send alerts
	moreC chan struct{}

	// stop channel to signal the sender goroutine to stop
	stopC chan struct{}

	// mutex to synchronize access to the queue
	queueMtx sync.RWMutex

	// wait group to wait for all goroutines to finish
	goroutinesWg sync.WaitGroup
}

func New(logger *slog.Logger, config Config) *Batcher {
	batcher := &Batcher{
		logger: logger,
		queue:  make(alertmanagertypes.PostableAlerts, 0, config.Capacity),
		config: config,
		moreC:  make(chan struct{}, 1),
		stopC:  make(chan struct{}),
		C:      make(chan alertmanagertypes.PostableAlerts, config.Size),
	}

	return batcher
}

// Start dispatches notifications continuously.
func (batcher *Batcher) Start(ctx context.Context) error {
	batcher.goroutinesWg.Add(1)
	go func() {
		defer batcher.goroutinesWg.Done()

		for {
			select {
			case <-batcher.stopC:
				for batcher.queueLen() > 0 {
					alerts := batcher.next()
					batcher.C <- alerts
				}
				close(batcher.C)
				return
			case <-batcher.moreC:
			}
			alerts := batcher.next()
			batcher.C <- alerts
			// If the queue still has items left, kick off the next iteration.
			if batcher.queueLen() > 0 {
				batcher.setMore()
			}
		}
	}()

	return nil
}

// Add queues the given alerts for processing.
func (batcher *Batcher) Add(ctx context.Context, alerts ...*alertmanagertypes.PostableAlert) {
	batcher.queueMtx.Lock()
	defer batcher.queueMtx.Unlock()

	// Queue capacity should be significantly larger than a single alert
	// batch could be.
	if d := len(alerts) - batcher.config.Capacity; d > 0 {
		alerts = alerts[d:]
		batcher.logger.WarnContext(ctx, "alert batch larger than queue capacity, dropping alerts", "num_dropped", d, "capacity", batcher.config.Capacity)
	}

	// If the queue is full, remove the oldest alerts in favor
	// of newer ones.
	if d := (len(batcher.queue) + len(alerts)) - batcher.config.Capacity; d > 0 {
		batcher.queue = batcher.queue[d:]
		batcher.logger.WarnContext(ctx, "alert batch queue full, dropping alerts", "num_dropped", d)
	}

	batcher.queue = append(batcher.queue, alerts...)

	// Notify sending goroutine that there are alerts to be processed.
	batcher.setMore()
}

// Stop shuts down the batcher.
func (batcher *Batcher) Stop(ctx context.Context) {
	close(batcher.stopC)
	batcher.goroutinesWg.Wait()
}

func (batcher *Batcher) queueLen() int {
	batcher.queueMtx.RLock()
	defer batcher.queueMtx.RUnlock()

	return len(batcher.queue)
}

func (batcher *Batcher) next() alertmanagertypes.PostableAlerts {
	batcher.queueMtx.Lock()
	defer batcher.queueMtx.Unlock()

	var alerts alertmanagertypes.PostableAlerts

	if len(batcher.queue) > batcher.config.Size {
		alerts = append(make(alertmanagertypes.PostableAlerts, 0, batcher.config.Size), batcher.queue[:batcher.config.Size]...)
		batcher.queue = batcher.queue[batcher.config.Size:]
	} else {
		alerts = append(make(alertmanagertypes.PostableAlerts, 0, len(batcher.queue)), batcher.queue...)
		batcher.queue = batcher.queue[:0]
	}

	return alerts
}

// setMore signals that the alert queue has items.
func (batcher *Batcher) setMore() {
	// If we cannot send on the channel, it means the signal already exists
	// and has not been consumed yet.
	select {
	case batcher.moreC <- struct{}{}:
	default:
	}
}
