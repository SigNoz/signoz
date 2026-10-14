package model

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestCoordinatorNotifiesAgentsIndependently(t *testing.T) {
	coordinator := newCoordinator()
	orgID := valuer.GenerateUUID()
	const (
		agentA = "agent-a"
		agentB = "agent-b"
		hash   = "config-hash"
	)

	type notification struct {
		agentID  string
		configID string
		err      error
	}
	notifications := make(chan notification, 2)
	callback := func(_ valuer.UUID, agentID string, configID string, err error) {
		notifications <- notification{agentID: agentID, configID: configID, err: err}
	}

	coordinator.listenToConfigUpdate(orgID, agentA, hash, callback)
	coordinator.listenToConfigUpdate(orgID, agentB, hash, callback)

	coordinator.notifySubscribers(orgID, agentA, hash, nil)

	first := <-notifications
	assert.Equal(t, agentA, first.agentID)
	assert.Equal(t, orgID.String()+hash, first.configID)
	assert.NoError(t, first.err)
	assert.Len(t, notifications, 0)

	failure := errors.New("deployment failed")
	coordinator.notifySubscribers(orgID, agentB, hash, failure)

	second := <-notifications
	assert.Equal(t, agentB, second.agentID)
	assert.Equal(t, orgID.String()+hash, second.configID)
	assert.ErrorIs(t, second.err, failure)
	assert.Len(t, notifications, 0)
}

func TestCoordinatorNotifiesAllSubscribersForAgentOnce(t *testing.T) {
	coordinator := newCoordinator()
	orgID := valuer.GenerateUUID()
	const (
		agentID = "agent-a"
		hash    = "config-hash"
	)

	var calls atomic.Int32
	callback := func(_ valuer.UUID, _ string, _ string, _ error) {
		calls.Add(1)
	}

	coordinator.listenToConfigUpdate(orgID, agentID, hash, callback)
	coordinator.listenToConfigUpdate(orgID, agentID, hash, callback)

	coordinator.notifySubscribers(orgID, agentID, hash, nil)
	coordinator.notifySubscribers(orgID, agentID, hash, nil)

	assert.Equal(t, int32(2), calls.Load())
}

func TestCoordinatorInvokesCallbacksOutsideLock(t *testing.T) {
	coordinator := newCoordinator()
	orgID := valuer.GenerateUUID()
	const (
		agentID = "agent-a"
		hash    = "config-hash"
	)

	callbackCompleted := make(chan struct{})
	coordinator.listenToConfigUpdate(orgID, agentID, hash, func(_ valuer.UUID, _ string, _ string, _ error) {
		coordinator.listenToConfigUpdate(orgID, agentID, "next-hash", func(_ valuer.UUID, _ string, _ string, _ error) {})
		close(callbackCompleted)
	})

	coordinator.notifySubscribers(orgID, agentID, hash, nil)

	select {
	case <-callbackCompleted:
	default:
		require.Fail(t, "callback could not subscribe to another update")
	}
}

func TestCoordinatorConcurrentSubscribeAndNotify(t *testing.T) {
	coordinator := newCoordinator()
	orgID := valuer.GenerateUUID()
	const iterations = 1_000

	var wg sync.WaitGroup
	for idx := range iterations {
		agentID := valuer.GenerateUUID().String()
		hash := valuer.GenerateUUID().String()

		wg.Add(2)
		go func() {
			defer wg.Done()
			coordinator.listenToConfigUpdate(orgID, agentID, hash, func(_ valuer.UUID, _ string, _ string, _ error) {})
		}()
		go func() {
			defer wg.Done()
			coordinator.notifySubscribers(orgID, agentID, hash, nil)
		}()

		if idx%10 == 0 {
			wg.Wait()
		}
	}
	wg.Wait()
}
