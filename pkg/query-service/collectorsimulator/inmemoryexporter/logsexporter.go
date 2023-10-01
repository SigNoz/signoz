package inmemoryexporter

import (
	"context"
	"fmt"
	"sync"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/pdata/plog"
)

/* An in-memory exporter for use in testing and previewing log pipelines.*/
type InMemoryLogsExporter struct {
	// Unique identifier for the exporter.
	id string
	// mu protects the data below
	mu sync.Mutex
	// slice of pdata.Logs that were received by this exporter.
	logs []plog.Logs
}

// ConsumeLogs implements component.LogsExporter.
func (e *InMemoryLogsExporter) ConsumeLogs(ctx context.Context, ld plog.Logs) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.logs = append(e.logs, ld)
	return nil
}

// GetLogs returns a slice of pdata.Logs that were received by this exporter.
func (e *InMemoryLogsExporter) GetLogs() []plog.Logs {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.logs
}

// ResetLogs removes all logs that were received by this exporter.
func (e *InMemoryLogsExporter) ResetLogs() {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.logs = nil
}

func (e *InMemoryLogsExporter) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{MutatesData: false}
}

// Keep track of all exporter instances in the process.
// Useful for getting a hold of the exporter in scenarios where one doesn't
// create the instances. Eg: bringing up a collector service from collector config
var allExporterInstances map[string]*InMemoryLogsExporter
var allExportersLock sync.Mutex

func init() {
	allExporterInstances = make(map[string]*InMemoryLogsExporter)
}

func (e *InMemoryLogsExporter) Start(ctx context.Context, host component.Host) error {
	allExportersLock.Lock()
	defer allExportersLock.Unlock()

	if allExporterInstances[e.id] != nil {
		return fmt.Errorf("exporter with id %s is already running", e.id)
	}

	allExporterInstances[e.id] = e
	return nil
}

func (e *InMemoryLogsExporter) Shutdown(ctx context.Context) error {
	allExportersLock.Lock()
	defer allExportersLock.Unlock()

	delete(allExporterInstances, e.id)
	return nil
}

func GetExporterInstance(id string) *InMemoryLogsExporter {
	return allExporterInstances[id]
}
