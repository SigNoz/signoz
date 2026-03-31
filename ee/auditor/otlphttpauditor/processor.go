package otlphttpauditor

import (
	"context"
	"sync"

	sdklog "go.opentelemetry.io/otel/sdk/log"
)

// accumulatingProcessor collects log records emitted via the SDK Logger
// and exports them as a single batch when FlushBatch is called.
// This bridges the per-record Logger.Emit (which sets InstrumentationScope)
// with the batch Exporter.Export (single HTTP call per batch).
type accumulatingProcessor struct {
	exporter sdklog.Exporter

	mu      sync.Mutex
	records []sdklog.Record
}

func newAccumulatingProcessor(exporter sdklog.Exporter) *accumulatingProcessor {
	return &accumulatingProcessor{exporter: exporter}
}

func (p *accumulatingProcessor) OnEmit(_ context.Context, record *sdklog.Record) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.records = append(p.records, record.Clone())
	return nil
}

// FlushBatch exports all accumulated records in a single call and clears the buffer.
func (p *accumulatingProcessor) FlushBatch(ctx context.Context) error {
	p.mu.Lock()
	records := p.records
	p.records = nil
	p.mu.Unlock()

	if len(records) == 0 {
		return nil
	}

	return p.exporter.Export(ctx, records)
}

func (p *accumulatingProcessor) Enabled(_ context.Context, _ sdklog.EnabledParameters) bool {
	return true
}

func (p *accumulatingProcessor) Shutdown(ctx context.Context) error {
	return p.exporter.Shutdown(ctx)
}

func (p *accumulatingProcessor) ForceFlush(ctx context.Context) error {
	return p.exporter.ForceFlush(ctx)
}
