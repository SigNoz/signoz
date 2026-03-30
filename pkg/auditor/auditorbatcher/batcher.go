package auditorbatcher

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

// ExportFunc is called by the batcher to export a batch of audit events.
// The context carries the active trace span for the export operation.
type ExportFunc func(ctx context.Context, events []audittypes.AuditEvent) error

// Batcher buffers audit events and flushes them in batches.
// A flush is triggered when either BatchSize events accumulate or
// FlushInterval elapses, whichever comes first.
type Batcher struct {
	settings factory.ScopedProviderSettings
	config   Config
	metrics  *telemetry
	exportFn ExportFunc

	queue    []audittypes.AuditEvent
	queueMtx sync.Mutex

	moreC chan struct{}
	stopC chan struct{}

	goroutinesWg sync.WaitGroup
}

func New(settings factory.ScopedProviderSettings, config Config, exportFn ExportFunc) (*Batcher, error) {
	metrics, err := newTelemetry(settings.Meter())
	if err != nil {
		return nil, err
	}

	b := &Batcher{
		settings: settings,
		config:   config,
		metrics:  metrics,
		exportFn: exportFn,
		queue:    make([]audittypes.AuditEvent, 0, config.BufferSize),
		moreC:    make(chan struct{}, 1),
		stopC:    make(chan struct{}),
	}

	_, err = settings.Meter().RegisterCallback(func(_ context.Context, o metric.Observer) error {
		o.ObserveInt64(b.metrics.bufferSize, int64(b.queueLen()))
		return nil
	}, b.metrics.bufferSize)
	if err != nil {
		return nil, err
	}

	return b, nil
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
				b.drain(ctx)
				return
			case <-b.moreC:
				if b.queueLen() >= b.config.BatchSize {
					b.flush(ctx)
				}
			case <-ticker.C:
				b.flush(ctx)
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
	ctx, span := b.settings.Tracer().Start(ctx, "auditorbatcher.Add", trace.WithAttributes(attribute.String("audit.event_name", event.EventName.String())))
	defer span.End()

	b.queueMtx.Lock()
	defer b.queueMtx.Unlock()

	if len(b.queue) >= b.config.BufferSize {
		b.metrics.eventsDropped.Add(ctx, 1)
		span.SetAttributes(attribute.Bool("audit.dropped", true))
		b.settings.Logger().WarnContext(ctx, "audit event dropped, buffer full", slog.Int("audit.buffer_size", b.config.BufferSize))
		return
	}

	b.queue = append(b.queue, event)
	b.setMore()
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

func (b *Batcher) export(ctx context.Context, events []audittypes.AuditEvent) {
	ctx, span := b.settings.Tracer().Start(ctx, "auditorbatcher.Export", trace.WithAttributes(attribute.Int("audit.batch_size", len(events))))
	defer span.End()

	b.metrics.eventsEmitted.Add(ctx, int64(len(events)))
	if err := b.exportFn(ctx, events); err != nil {
		b.metrics.writeErrors.Add(ctx, 1)
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		b.settings.Logger().ErrorContext(ctx, "audit batch export failed", errors.Attr(err), slog.Int("audit.batch_size", len(events)))
	}
}

func (b *Batcher) flush(ctx context.Context) {
	events := b.next()
	if len(events) == 0 {
		return
	}
	b.export(ctx, events)
}

func (b *Batcher) drain(ctx context.Context) {
	for b.queueLen() > 0 {
		events := b.next()
		if len(events) == 0 {
			return
		}
		b.export(ctx, events)
	}
}

func (b *Batcher) next() []audittypes.AuditEvent {
	b.queueMtx.Lock()
	defer b.queueMtx.Unlock()

	if len(b.queue) == 0 {
		return nil
	}

	n := min(b.config.BatchSize, len(b.queue))

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
