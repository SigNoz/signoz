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

func (r *InMemoryLogsReceiver) Capabilities() consumer.Capabilities {
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

func CleanupInstance(receiverId string) {
	allReceiversLock.Lock()
	defer allReceiversLock.Unlock()
	delete(allReceiverInstances, receiverId)
}

func (r *InMemoryLogsReceiver) Start(ctx context.Context, host component.Host) error {
	allReceiversLock.Lock()
	defer allReceiversLock.Unlock()

	if allReceiverInstances[r.id] != nil {
		return fmt.Errorf("receiver with id %s is already running", r.id)
	}

	allReceiverInstances[r.id] = r
	return nil
}

func (r *InMemoryLogsReceiver) Shutdown(ctx context.Context) error {
	CleanupInstance(r.id)
	return nil
}

func GetReceiverInstance(id string) *InMemoryLogsReceiver {
	return allReceiverInstances[id]
}
