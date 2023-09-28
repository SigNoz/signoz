package inmemoryexporter

import (
	"context"
	"sync"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

/* An in-memory exporter for use in testing and previewing log pipelines.*/

// InMemoryExporter is an in-memory exporter that can be used for testing.
// It implements component.TracesExporter, component.MetricsExporter and component.LogsExporter interfaces.
type InMemoryExporter struct {
	// Unique identifier for the exporter.
	id string
	// mu protects the below fields.
	mu sync.Mutex
	// traces is a slice of pdata.Traces that were received by this exporter.
	traces []ptrace.Traces
	// metrics is a slice of pdata.Metrics that were received by this exporter.
	metrics []pmetric.Metrics
	// logs is a slice of pdata.Logs that were received by this exporter.
	logs []plog.Logs
}

// Keep track of all exporter instances in the process.
// exporters add themselves to this map when `Start`ed and remove
// themselves when `Stop`ped.
// Useful for getting a hold of the exporter in scenarios where one doesn't
// create the instances. Eg: bringing up a collector service from collector config
var allExporterInstances map[string]*InMemoryExporter
var allExportersLock sync.Mutex

func init() {
	allExporterInstances = make(map[string]*InMemoryExporter)
}

func (e *InMemoryExporter) Start(ctx context.Context, host component.Host) error {
	allExportersLock.Lock()
	defer allExportersLock.Unlock()

	allExporterInstances[e.id] = e
	return nil
}

func (e *InMemoryExporter) Shutdown(ctx context.Context) error {
	allExportersLock.Lock()
	defer allExportersLock.Unlock()

	delete(allExporterInstances, e.id)
	return nil
}

func GetExporterInstance(id string) *InMemoryExporter {
	return allExporterInstances[id]
}

// Rest of InMemoryExporter functions

func (e *InMemoryExporter) ConsumeTraces(ctx context.Context, td ptrace.Traces) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.traces = append(e.traces, td)
	return nil
}

// ConsumeMetrics implements component.MetricsExporter.
func (e *InMemoryExporter) ConsumeMetrics(ctx context.Context, md pmetric.Metrics) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.metrics = append(e.metrics, md)
	return nil
}

// ConsumeLogs implements component.LogsExporter.
func (e *InMemoryExporter) ConsumeLogs(ctx context.Context, ld plog.Logs) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.logs = append(e.logs, ld)
	return nil
}

// GetTraces returns a slice of pdata.Traces that were received by this exporter.
func (e *InMemoryExporter) GetTraces() []ptrace.Traces {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.traces
}

// GetMetrics returns a slice of pdata.Metrics that were received by this exporter.
func (e *InMemoryExporter) GetMetrics() []pmetric.Metrics {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.metrics
}

// GetLogs returns a slice of pdata.Logs that were received by this exporter.
func (e *InMemoryExporter) GetLogs() []plog.Logs {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.logs
}

// ResetTraces removes all traces that were received by this exporter.
func (e *InMemoryExporter) ResetTraces() {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.traces = nil
}

// ResetMetrics removes all metrics that were received by this exporter.
func (e *InMemoryExporter) ResetMetrics() {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.metrics = nil
}

// ResetLogs removes all logs that were received by this exporter.
func (e *InMemoryExporter) ResetLogs() {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.logs = nil
}

func (e *InMemoryExporter) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{MutatesData: false}
}
