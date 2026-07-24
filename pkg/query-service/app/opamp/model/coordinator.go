package model

import (
	"errors"
	"sync"

	"github.com/SigNoz/signoz/pkg/valuer"
)

// communicates with calling apis when config is applied or fails
var coordinator = newCoordinator()

type OnChangeCallback func(orgId valuer.UUID, agentId string, hash string, err error)

type subscriberKey struct {
	orgID   string
	agentID string
	hash    string
}

// responsible for managing subscribers on config change
type Coordinator struct {
	mutex sync.Mutex

	// subscribers are isolated by organization, agent, and config hash so one
	// agent's terminal status cannot consume another agent's callbacks.
	subscribers map[subscriberKey][]OnChangeCallback
}

func newCoordinator() *Coordinator {
	return &Coordinator{
		subscribers: make(map[subscriberKey][]OnChangeCallback),
	}
}

func getSubscriberKey(orgId valuer.UUID, agentId string, hash string) subscriberKey {
	return subscriberKey{
		orgID:   orgId.String(),
		agentID: agentId,
		hash:    hash,
	}
}

func onConfigSuccess(orgId valuer.UUID, agentId string, hash string) {
	coordinator.notifySubscribers(orgId, agentId, hash, nil)
}

func onConfigFailure(orgId valuer.UUID, agentId string, hash string, errorMessage string) {
	coordinator.notifySubscribers(orgId, agentId, hash, errors.New(errorMessage))
}

// notifySubscribers removes and notifies callbacks for one agent's config
// deployment. Callbacks run outside the lock so they can safely subscribe to
// another update and cannot block other coordinator operations.
func (coordinator *Coordinator) notifySubscribers(orgId valuer.UUID, agentId string, hash string, err error) {
	key := getSubscriberKey(orgId, agentId, hash)

	coordinator.mutex.Lock()
	subs, ok := coordinator.subscribers[key]
	if !ok {
		coordinator.mutex.Unlock()
		return
	}
	delete(coordinator.subscribers, key)
	coordinator.mutex.Unlock()

	for _, s := range subs {
		s(orgId, agentId, orgId.String()+hash, err)
	}
}

// callers subscribe to this function to listen on config change requests
func ListenToConfigUpdate(orgId valuer.UUID, agentId string, hash string, ss OnChangeCallback) {
	coordinator.listenToConfigUpdate(orgId, agentId, hash, ss)
}

func (coordinator *Coordinator) listenToConfigUpdate(orgId valuer.UUID, agentId string, hash string, ss OnChangeCallback) {
	coordinator.mutex.Lock()
	defer coordinator.mutex.Unlock()

	key := getSubscriberKey(orgId, agentId, hash)

	if subs, ok := coordinator.subscribers[key]; ok {
		coordinator.subscribers[key] = append(subs, ss)
	} else {
		coordinator.subscribers[key] = []OnChangeCallback{ss}
	}
}
