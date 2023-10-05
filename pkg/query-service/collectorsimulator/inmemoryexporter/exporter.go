package inmemoryexporter

import (
	"context"
	"fmt"
	"sync"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/pdata/plog"
)

// An in-memory exporter for testing and generating previews.
type InMemoryExporter struct {
	// Unique identifier for the exporter.
	id string
	// mu protects the data below
	mu sync.Mutex
	// slice of pdata.Logs that were received by this exporter.
	logs []plog.Logs
}

// ConsumeLogs implements component.LogsExporter.
func (e *InMemoryExporter) ConsumeLogs(ctx context.Context, ld plog.Logs) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.logs = append(e.logs, ld)
	return nil
}

func (e *InMemoryExporter) GetLogs() []plog.Logs {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.logs
}

func (e *InMemoryExporter) ResetLogs() {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.logs = nil
}

func (e *InMemoryExporter) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{MutatesData: false}
}

// Keep track of all exporter instances in the process.
// Useful for getting a hold of the exporter in scenarios where one doesn't
// create the instances. Eg: bringing up a collector service from collector config
var allExporterInstances map[string]*InMemoryExporter
var allExportersLock sync.Mutex

func init() {
	allExporterInstances = make(map[string]*InMemoryExporter)
}

func GetExporterInstance(id string) *InMemoryExporter {
	return allExporterInstances[id]
}

func CleanupInstance(exporterId string) {
	allExportersLock.Lock()
	defer allExportersLock.Unlock()

	delete(allExporterInstances, exporterId)
}

func (e *InMemoryExporter) Start(ctx context.Context, host component.Host) error {
	allExportersLock.Lock()
	defer allExportersLock.Unlock()

	if allExporterInstances[e.id] != nil {
		return fmt.Errorf("exporter with id %s is already running", e.id)
	}

	allExporterInstances[e.id] = e
	return nil
}

func (e *InMemoryExporter) Shutdown(ctx context.Context) error {
	CleanupInstance(e.id)
	return nil
}
