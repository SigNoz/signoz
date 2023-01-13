package opamp

import (
	"fmt"
	"sync"

	otelConfMap "go.opentelemetry.io/collector/confmap"
)

var RequestQueueLength = 10

// ChangeRequest captures one config change event at a time
type ChangeRequest struct {
	config otelConfMap.Conf
}

// RequestQueue handles queuing and processing change requests
type RequestQueue struct {
	// channel to accept change requests
	ch chan ChangeRequest

	client Client

	// mutex to make single config push to opAmp at a time
	m sync.Mutex
}

// NewRequestQueue checks if opAmp server is reachable and if so
// creates a request queue to handle config changes
func NewRequestQueue() error {

	return fmt.Errorf("unimplemented")
}

// Push accepts a new config change request and pushes it in the queue
func (q *RequestQueue) Push(c *ChangeRequest, errCh chan<- error) {

}

// Processor runs a go-routine and handles a change request at a time
func (q *RequestQueue) Start() {

}

// process handles one request
func (q *RequestQueue) process(c *ChangeRequest) error {

}

func (q *RequestQueue) Stop() {
	close(q.ch)
}
