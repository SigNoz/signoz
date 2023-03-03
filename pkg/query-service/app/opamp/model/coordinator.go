package model

import (
	"fmt"
	"sync"
)

// communicates with calling apis when config is applied or fails
var coordinator *Coordinator

func init() {
	coordinator = &Coordinator{
		subscribers: make(map[string][]OnChangeCallback),
	}
}

type OnChangeCallback func(hash string, err error)

// responsible for managing subscribers on config change
type Coordinator struct {
	mutex sync.Mutex

	// hash wise list of subscribers
	subscribers map[string][]OnChangeCallback
}

func onConfigSuccess(hash string) {
	notifySubscribers(hash, nil)
}

func onConfigFailure(hash string, errorMessage string) {
	notifySubscribers(hash, fmt.Errorf(errorMessage))
}

// OnSuccess listens to config changes and notifies subscribers
func notifySubscribers(hash string, err error) {
	// this method currently does not handle multi-agent scenario.
	// as soon as a message is delivered, we release all the subscribers
	// for a given hash
	subs, ok := coordinator.subscribers[hash]
	if !ok {
		return
	}

	for _, s := range subs {
		s(hash, err)
	}

	// delete all subscribers for this hash, assume future
	// notifies will be disabled. the first response is processed
	delete(coordinator.subscribers, hash)
}

// callers subscribe to this function to listen on config change requests
func ListenToConfigUpdate(hash string, ss OnChangeCallback) {
	coordinator.mutex.Lock()
	defer coordinator.mutex.Unlock()

	if subs, ok := coordinator.subscribers[hash]; ok {
		subs = append(subs, ss)
		coordinator.subscribers[hash] = subs
	} else {
		coordinator.subscribers[hash] = []OnChangeCallback{ss}
	}
}
