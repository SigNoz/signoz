package model

import (
	"errors"
	"sync"

	"github.com/SigNoz/signoz/pkg/valuer"
)

// communicates with calling apis when config is applied or fails
var coordinator *Coordinator

func init() {
	subscribers := make(map[string][]OnChangeCallback, 0)
	coordinator = &Coordinator{
		subscribers: subscribers,
	}
}

type OnChangeCallback func(orgId valuer.UUID, agentId string, hash string, err error)

// responsible for managing subscribers on config change
type Coordinator struct {
	mutex sync.Mutex

	// hash wise list of subscribers
	subscribers map[string][]OnChangeCallback
}

func getSubscriberKey(orgId valuer.UUID, hash string) string {
	return orgId.String() + hash
}

func onConfigSuccess(orgId valuer.UUID, agentId string, hash string) {
	key := getSubscriberKey(orgId, hash)
	notifySubscribers(orgId, agentId, key, nil)
}

func onConfigFailure(orgId valuer.UUID, agentId string, hash string, errorMessage string) {
	key := getSubscriberKey(orgId, hash)
	notifySubscribers(orgId, agentId, key, errors.New(errorMessage))
}

// OnSuccess listens to config changes and notifies subscribers
func notifySubscribers(orgId valuer.UUID, agentId string, key string, err error) {
	// this method currently does not handle multi-agent scenario.
	// as soon as a message is delivered, we release all the subscribers
	// for a given key
	subs, ok := coordinator.subscribers[key]
	if !ok {
		return
	}

	for _, s := range subs {
		s(orgId, agentId, key, err)
	}

	// delete all subscribers for this key, assume future
	// notifies will be disabled. the first response is processed
	delete(coordinator.subscribers, key)
}

// callers subscribe to this function to listen on config change requests
func ListenToConfigUpdate(orgId valuer.UUID, agentId string, hash string, ss OnChangeCallback) {
	coordinator.mutex.Lock()
	defer coordinator.mutex.Unlock()

	key := getSubscriberKey(orgId, hash)
	if subs, ok := coordinator.subscribers[key]; ok {
		subs = append(subs, ss)
		coordinator.subscribers[key] = subs
	} else {
		coordinator.subscribers[key] = []OnChangeCallback{ss}
	}
}
