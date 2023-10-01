package inmemoryreceiver

import (
	"context"
	"fmt"
	"sync"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/pdata/plog"
)

// In memory receivers for testing and simulation
type InMemoryLogsReceiver struct {
	// Unique identifier for the receiver.
	id string

	nextConsumer consumer.Logs
}

func (r *InMemoryLogsReceiver) ConsumeLogs(ctx context.Context, ld plog.Logs) error {
	return r.nextConsumer.ConsumeLogs(ctx, ld)
}

func (e *InMemoryLogsReceiver) Capabilities() consumer.Capabilities {
	return consumer.Capabilities{MutatesData: false}
}

// Keep track of all receiver instances in the process.
// Useful for getting a hold of the receiver in scenarios where one doesn't
// create the instances. Eg: bringing up a collector service from collector config
var allReceiverInstances map[string]*InMemoryLogsReceiver
var allReceiversLock sync.Mutex

func init() {
	allReceiverInstances = make(map[string]*InMemoryLogsReceiver)
}

func (e *InMemoryLogsReceiver) Start(ctx context.Context, host component.Host) error {
	allReceiversLock.Lock()
	defer allReceiversLock.Unlock()

	if allReceiverInstances[e.id] != nil {
		return fmt.Errorf("receiver with id %s is already running", e.id)
	}

	allReceiverInstances[e.id] = e
	return nil
}

func (e *InMemoryLogsReceiver) Shutdown(ctx context.Context) error {
	allReceiversLock.Lock()
	defer allReceiversLock.Unlock()

	delete(allReceiverInstances, e.id)
	return nil
}

func GetReceiverInstance(id string) *InMemoryLogsReceiver {
	return allReceiverInstances[id]
}
