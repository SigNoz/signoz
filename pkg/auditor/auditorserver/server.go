package auditorserver

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

var _ factory.ServiceWithHealthy = (*Server)(nil)

// ExportFunc is called by the server to export a batch of audit events.
// The context carries the active trace span for the export operation.
type ExportFunc func(ctx context.Context, events []audittypes.AuditEvent) error

// Server buffers audit events and flushes them in batches.
// A flush is triggered when either BatchSize events accumulate or
// FlushInterval elapses, whichever comes first.
type Server struct {
	// settings provides logger, meter, and tracer for instrumentation.
	settings factory.ScopedProviderSettings

	// config holds buffer size, batch size, and flush interval.
	config Config

	// exportFn is called with each batch of events ready for export.
	exportFn ExportFunc

	// queue holds buffered events waiting to be batched.
	queue []audittypes.AuditEvent

	// queueMtx guards access to queue.
	queueMtx sync.Mutex

	// moreC signals the flush goroutine that new events are available.
	moreC chan struct{}

	// healthyC is closed once Start has registered the flush goroutine.
	// Also serves as the Healthy() signal for factory.ServiceWithHealthy.
	healthyC chan struct{}

	// stopC signals the flush goroutine to drain and shut down.
	stopC chan struct{}

	// goroutinesWg tracks the background flush goroutine.
	goroutinesWg sync.WaitGroup

	// metrics holds OTel counters and gauges for observability.
	metrics *serverMetrics
}

func New(settings factory.ScopedProviderSettings, config Config, exportFn ExportFunc) (*Server, error) {
	metrics, err := newServerMetrics(settings.Meter())
	if err != nil {
		return nil, err
	}

	server := &Server{
		settings: settings,
		config:   config,
		metrics:  metrics,
		exportFn: exportFn,
		queue:    make([]audittypes.AuditEvent, 0, config.BufferSize),
		moreC:    make(chan struct{}, 1),
		healthyC: make(chan struct{}),
		stopC:    make(chan struct{}),
	}

	_, err = settings.Meter().RegisterCallback(func(_ context.Context, o metric.Observer) error {
		o.ObserveInt64(server.metrics.bufferSize, int64(server.queueLen()))
		return nil
	}, server.metrics.bufferSize)
	if err != nil {
		return nil, err
	}

	return server, nil
}

// Start runs the background flush loop. It blocks until Stop is called.
func (server *Server) Start(ctx context.Context) error {
	server.goroutinesWg.Add(1)
	close(server.healthyC)

	go func() {
		defer server.goroutinesWg.Done()

		ticker := time.NewTicker(server.config.FlushInterval)
		defer ticker.Stop()

		for {
			select {
			case <-server.stopC:
				server.drain(ctx)
				return
			case <-server.moreC:
				if server.queueLen() >= server.config.BatchSize {
					server.flush(ctx)
				}
			case <-ticker.C:
				server.flush(ctx)
			}
		}
	}()

	server.goroutinesWg.Wait()
	return nil
}

// Add enqueues an audit event for batched export.
// If the buffer is full the event is dropped and a warning is logged.
func (server *Server) Add(ctx context.Context, event audittypes.AuditEvent) {
	ctx, span := server.settings.Tracer().Start(ctx, "auditorserver.Add", trace.WithAttributes(attribute.String("audit.event_name", event.EventName.String())))
	defer span.End()

	server.queueMtx.Lock()
	defer server.queueMtx.Unlock()

	if len(server.queue) >= server.config.BufferSize {
		server.metrics.eventsDropped.Add(ctx, 1)
		span.SetAttributes(attribute.Bool("audit.dropped", true))
		server.settings.Logger().WarnContext(ctx, "audit event dropped, buffer full", slog.Int("audit_buffer_size", server.config.BufferSize))
		return
	}

	server.queue = append(server.queue, event)
	server.setMore()
}

// Healthy returns a channel that is closed once the server is ready to accept events.
func (server *Server) Healthy() <-chan struct{} {
	return server.healthyC
}

// Stop signals the background loop to drain remaining events and shut down.
// It blocks until all buffered events have been exported.
func (server *Server) Stop(ctx context.Context) error {
	<-server.healthyC
	close(server.stopC)
	server.goroutinesWg.Wait()
	return nil
}

func (server *Server) queueLen() int {
	server.queueMtx.Lock()
	defer server.queueMtx.Unlock()
	return len(server.queue)
}

func (server *Server) export(ctx context.Context, events []audittypes.AuditEvent) {
	ctx, span := server.settings.Tracer().Start(ctx, "auditorserver.Export", trace.WithAttributes(attribute.Int("audit.batch_size", len(events))))
	defer span.End()

	server.metrics.eventsEmitted.Add(ctx, int64(len(events)))
	if err := server.exportFn(ctx, events); err != nil {
		server.metrics.writeErrors.Add(ctx, 1)
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		server.settings.Logger().ErrorContext(ctx, "audit batch export failed", errors.Attr(err), slog.Int("audit_batch_size", len(events)))
	}
}

func (server *Server) flush(ctx context.Context) {
	events := server.next()
	if len(events) == 0 {
		return
	}
	server.export(ctx, events)
}

func (server *Server) drain(ctx context.Context) {
	for server.queueLen() > 0 {
		events := server.next()
		if len(events) == 0 {
			return
		}
		server.export(ctx, events)
	}
}

func (server *Server) next() []audittypes.AuditEvent {
	server.queueMtx.Lock()
	defer server.queueMtx.Unlock()

	if len(server.queue) == 0 {
		return nil
	}

	n := min(server.config.BatchSize, len(server.queue))

	batch := make([]audittypes.AuditEvent, n)
	copy(batch, server.queue[:n])
	server.queue = server.queue[n:]

	return batch
}

func (server *Server) setMore() {
	select {
	case server.moreC <- struct{}{}:
	default:
	}
}
