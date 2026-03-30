package auditorbatcher

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
)

// Batcher buffers audit events and flushes them in batches.
// A flush is triggered when either Size events accumulate or
// FlushInterval elapses, whichever comes first.
type Batcher struct {
	logger *slog.Logger
	config Config

	batchC chan []audittypes.AuditEvent

	queue    []audittypes.AuditEvent
	queueMtx sync.Mutex

	moreC chan struct{}
	stopC chan struct{}

	goroutinesWg sync.WaitGroup

	// dropped counts events dropped due to a full buffer.
	dropped int64
}

func New(logger *slog.Logger, config Config) *Batcher {
	return &Batcher{
		batchC: make(chan []audittypes.AuditEvent, config.Size),
		logger: logger,
		config: config,
		queue:  make([]audittypes.AuditEvent, 0, config.Capacity),
		moreC:  make(chan struct{}, 1),
		stopC:  make(chan struct{}),
	}
}

// Start runs the background flush loop. It blocks until Stop is called.
func (b *Batcher) Start(ctx context.Context) error {
	b.goroutinesWg.Add(1)
	go func() {
		defer b.goroutinesWg.Done()

		ticker := time.NewTicker(b.config.FlushInterval)
		defer ticker.Stop()

		for {
			select {
			case <-b.stopC:
				b.drain()
				close(b.batchC)
				return
			case <-b.moreC:
				if b.queueLen() >= b.config.Size {
					b.flush()
				}
			case <-ticker.C:
				b.flush()
			}
		}
	}()

	<-b.stopC
	b.goroutinesWg.Wait()
	return nil
}

// Add enqueues an audit event for batched export.
// If the buffer is full the event is dropped and a warning is logged.
func (b *Batcher) Add(ctx context.Context, event audittypes.AuditEvent) {
	b.queueMtx.Lock()
	defer b.queueMtx.Unlock()

	if len(b.queue) >= b.config.Capacity {
		b.dropped++
		b.logger.WarnContext(ctx, "audit event dropped, buffer full",
			slog.Int64("total_dropped", b.dropped),
			slog.Int("capacity", b.config.Capacity),
		)
		return
	}

	b.queue = append(b.queue, event)
	b.setMore()
}

// Receive returns a channel that yields batches of audit events ready for export.
// The channel is closed when the batcher is stopped and all remaining events are drained.
func (b *Batcher) Receive() <-chan []audittypes.AuditEvent {
	return b.batchC
}

// Stop signals the background loop to drain remaining events and shut down.
func (b *Batcher) Stop(ctx context.Context) error {
	close(b.stopC)
	b.goroutinesWg.Wait()
	return nil
}

func (b *Batcher) queueLen() int {
	b.queueMtx.Lock()
	defer b.queueMtx.Unlock()
	return len(b.queue)
}

func (b *Batcher) flush() {
	batch := b.next()
	if len(batch) == 0 {
		return
	}
	b.batchC <- batch
}

func (b *Batcher) drain() {
	for b.queueLen() > 0 {
		batch := b.next()
		if len(batch) == 0 {
			return
		}
		b.batchC <- batch
	}
}

func (b *Batcher) next() []audittypes.AuditEvent {
	b.queueMtx.Lock()
	defer b.queueMtx.Unlock()

	if len(b.queue) == 0 {
		return nil
	}

	n := min(b.config.Size, len(b.queue))

	batch := make([]audittypes.AuditEvent, n)
	copy(batch, b.queue[:n])
	b.queue = b.queue[n:]

	return batch
}

func (b *Batcher) setMore() {
	select {
	case b.moreC <- struct{}{}:
	default:
	}
}
