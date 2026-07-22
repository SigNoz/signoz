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

// getSubscriberKey returns a key that uniquely identifies a (org, agent, config-hash)
// triple. Including the agent ID ensures that concurrent deployments to different
// agents under the same org and hash do not share subscribers and therefore cannot
// deliver a result from the wrong agent to a waiting caller.
func getSubscriberKey(orgId valuer.UUID, agentId string, hash string) string {
	return orgId.String() + agentId + hash
}

func onConfigSuccess(orgId valuer.UUID, agentId string, hash string) {
	key := getSubscriberKey(orgId, agentId, hash)
	notifySubscribers(orgId, agentId, key, nil)
}

func onConfigFailure(orgId valuer.UUID, agentId string, hash string, errorMessage string) {
	key := getSubscriberKey(orgId, agentId, hash)
	notifySubscribers(orgId, agentId, key, errors.New(errorMessage))
}

// notifySubscribers delivers a config-change result to all callbacks registered
// for key, then removes them. It holds coordinator.mutex for the entire operation
// so concurrent ListenToConfigUpdate calls cannot observe a partially-torn map.
func notifySubscribers(orgId valuer.UUID, agentId string, key string, err error) {
	coordinator.mutex.Lock()
	subs, ok := coordinator.subscribers[key]
	if !ok {
		coordinator.mutex.Unlock()
		return
	}
	// Drain the entry before invoking callbacks so the map is consistent if a
	// callback re-registers for the same key.
	delete(coordinator.subscribers, key)
	coordinator.mutex.Unlock()

	for _, s := range subs {
		s(orgId, agentId, key, err)
	}
}

// ListenToConfigUpdate registers ss to be called when the config identified by
// (orgId, agentId, hash) is applied or fails. The agent ID is part of the
// subscription key so that results from one agent are not delivered to callers
// waiting on a different agent.
func ListenToConfigUpdate(orgId valuer.UUID, agentId string, hash string, ss OnChangeCallback) {
	coordinator.mutex.Lock()
	defer coordinator.mutex.Unlock()

	key := getSubscriberKey(orgId, agentId, hash)

	coordinator.subscribers[key] = append(coordinator.subscribers[key], ss)
}
