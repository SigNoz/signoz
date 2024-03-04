// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package idbatcher defines a pipeline of fixed size in which the
// elements are batches of ids.
package idbatcher // import "github.com/SigNoz/signoz-otel-collector/processor/internal/idbatcher"

import (
	"errors"
	"sync"

	"go.opentelemetry.io/collector/pdata/pcommon"
)

var (
	// ErrInvalidNumBatches occurs when an invalid number of batches is specified.
	ErrInvalidNumBatches = errors.New("invalid number of batches, it must be greater than zero")
	// ErrInvalidBatchChannelSize occurs when an invalid batch channel size is specified.
	ErrInvalidBatchChannelSize = errors.New("invalid batch channel size, it must be greater than zero")
)

// Batch is the type of batches held by the Batcher.
type Batch []pcommon.TraceID

// Batcher behaves like a pipeline of batches that has a fixed number of batches in the pipe
// and a new batch being built outside of the pipe. Items can be concurrently added to the batch
// currently being built. When the batch being built is closed, the oldest batch in the pipe
// is pushed out so the one just closed can be put on the end of the pipe (this is done as an
// atomic operation). The caller is in control of when a batch is completed and a new one should
// be started.
type Batcher interface {
	// AddToCurrentBatch puts the given id on the batch being currently built. The client is in charge
	// of limiting the growth of the current batch if appropriate for its scenario. It can
	// either call CloseCurrentAndTakeFirstBatch earlier or stop adding new items depending on what is
	// required by the scenario.
	AddToCurrentBatch(id pcommon.TraceID)
	// CloseCurrentAndTakeFirstBatch takes the batch at the front of the pipe, and moves the current
	// batch to the end of the pipe, creating a new batch to receive new items. This operation should
	// be atomic.
	// It returns the batch that was in front of the pipe and a boolean that if true indicates that
	// there are more batches to be retrieved.
	CloseCurrentAndTakeFirstBatch() (Batch, bool)
	// Stop informs that no more items are going to be batched and the pipeline can be read until it
	// is empty. After this method is called attempts to enqueue new items will panic.
	Stop()
}

var _ Batcher = (*batcher)(nil)

type batcher struct {
	pendingIds chan pcommon.TraceID // Channel for the ids to be added to the next batch.
	batches    chan Batch           // Channel with already captured batches.

	// cbMutex protects the currentBatch storing ids.
	cbMutex      sync.Mutex
	currentBatch Batch

	newBatchesInitialCapacity uint64
	stopchan                  chan bool
	stopped                   bool
	stopLock                  sync.RWMutex
}

// New creates a Batcher that will hold numBatches in its pipeline, having a channel with
// batchChannelSize to receive new items. New batches will be created with capacity set to
// newBatchesInitialCapacity.
func New(numBatches, newBatchesInitialCapacity, batchChannelSize uint64) (Batcher, error) {
	if numBatches < 1 {
		return nil, ErrInvalidNumBatches
	}
	if batchChannelSize < 1 {
		return nil, ErrInvalidBatchChannelSize
	}

	batches := make(chan Batch, numBatches)
	// First numBatches batches will be empty in order to simplify clients that are running
	// CloseCurrentAndTakeFirstBatch on a timer and want to delay the processing of the first
	// batch with actual data. This way there is no need for accounting on the client side and
	// a single timer can be started immediately.
	for i := uint64(0); i < numBatches; i++ {
		batches <- nil
	}

	batcher := &batcher{
		pendingIds:                make(chan pcommon.TraceID, batchChannelSize),
		batches:                   batches,
		currentBatch:              make(Batch, 0, newBatchesInitialCapacity),
		newBatchesInitialCapacity: newBatchesInitialCapacity,
		stopchan:                  make(chan bool),
	}

	// Single goroutine that keeps filling the current batch, contention is expected only
	// when the current batch is being switched.
	go func() {
		for id := range batcher.pendingIds {
			batcher.cbMutex.Lock()
			batcher.currentBatch = append(batcher.currentBatch, id)
			batcher.cbMutex.Unlock()
		}
		batcher.stopchan <- true
	}()

	return batcher, nil
}

func (b *batcher) AddToCurrentBatch(id pcommon.TraceID) {
	b.pendingIds <- id
}

func (b *batcher) CloseCurrentAndTakeFirstBatch() (Batch, bool) {
	if readBatch, ok := <-b.batches; ok {
		b.stopLock.RLock()
		if !b.stopped {
			nextBatch := make(Batch, 0, b.newBatchesInitialCapacity)
			b.cbMutex.Lock()
			b.batches <- b.currentBatch
			b.currentBatch = nextBatch
			b.cbMutex.Unlock()
		}
		b.stopLock.RUnlock()
		return readBatch, true
	}

	readBatch := b.currentBatch
	b.currentBatch = nil
	return readBatch, false
}

func (b *batcher) Stop() {
	close(b.pendingIds)
	b.stopLock.Lock()
	b.stopped = <-b.stopchan
	b.stopLock.Unlock()
	close(b.batches)
}
