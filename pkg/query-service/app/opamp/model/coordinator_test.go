package model

import (
	"sync"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// TestCoordinator_NoRaceOnConcurrentListenAndNotify runs ListenToConfigUpdate
// and onConfigSuccess concurrently. The -race detector catches any unsynchronised
// access to the subscribers map that existed before this fix.
func TestCoordinator_NoRaceOnConcurrentListenAndNotify(t *testing.T) {
	const goroutines = 20
	orgID := valuer.GenerateUUID()

	var wg sync.WaitGroup
	for i := 0; i < goroutines; i++ {
		wg.Add(2)
		agentID := valuer.GenerateUUID().String()
		hash := valuer.GenerateUUID().String()

		go func() {
			defer wg.Done()
			ListenToConfigUpdate(orgID, agentID, hash, func(valuer.UUID, string, string, error) {})
		}()
		go func() {
			defer wg.Done()
			onConfigSuccess(orgID, agentID, hash)
		}()
	}
	wg.Wait()
}

// TestCoordinator_AgentIsolation verifies that a notification for agent A does
// not invoke the subscriber registered for agent B on the same org and hash.
func TestCoordinator_AgentIsolation(t *testing.T) {
	orgID := valuer.GenerateUUID()
	hash := valuer.GenerateUUID().String()
	agentA := valuer.GenerateUUID().String()
	agentB := valuer.GenerateUUID().String()

	calledFor := []string{}
	var mu sync.Mutex

	ListenToConfigUpdate(orgID, agentA, hash, func(_ valuer.UUID, agentId string, _ string, _ error) {
		mu.Lock(); calledFor = append(calledFor, agentId); mu.Unlock()
	})
	ListenToConfigUpdate(orgID, agentB, hash, func(_ valuer.UUID, agentId string, _ string, _ error) {
		mu.Lock(); calledFor = append(calledFor, agentId); mu.Unlock()
	})

	// Notify only agentA
	onConfigSuccess(orgID, agentA, hash)

	mu.Lock()
	defer mu.Unlock()
	require.Equal(t, []string{agentA}, calledFor, "only agentA's subscriber should fire")
}
