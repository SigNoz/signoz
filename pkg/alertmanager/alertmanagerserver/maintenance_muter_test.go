package alertmanagerserver

import (
	"context"
	"errors"
	"log/slog"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// fakeMaintenanceStore implements alertmanagertypes.MaintenanceStore with an in-memory list.
// It counts ListPlannedMaintenance calls so tests can assert caching behavior.
type fakeMaintenanceStore struct {
	mu    sync.Mutex
	items []*alertmanagertypes.PlannedMaintenance
	err   error
	calls int
}

func (s *fakeMaintenanceStore) ListPlannedMaintenance(_ context.Context, _ string) ([]*alertmanagertypes.PlannedMaintenance, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls++
	if s.err != nil {
		return nil, s.err
	}
	return s.items, nil
}

func (s *fakeMaintenanceStore) callCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.calls
}

func (s *fakeMaintenanceStore) setError(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.err = err
}

// Remaining MaintenanceStore methods — unused by MaintenanceMuter.
func (s *fakeMaintenanceStore) CreatePlannedMaintenance(context.Context, *alertmanagertypes.PostablePlannedMaintenance) (*alertmanagertypes.PlannedMaintenance, error) {
	return nil, nil
}
func (s *fakeMaintenanceStore) DeletePlannedMaintenance(context.Context, valuer.UUID) error {
	return nil
}
func (s *fakeMaintenanceStore) GetPlannedMaintenanceByID(context.Context, valuer.UUID) (*alertmanagertypes.PlannedMaintenance, error) {
	return nil, nil
}
func (s *fakeMaintenanceStore) UpdatePlannedMaintenance(context.Context, *alertmanagertypes.PostablePlannedMaintenance, valuer.UUID) error {
	return nil
}

func newMuter(t *testing.T, items ...*alertmanagertypes.PlannedMaintenance) (*MaintenanceMuter, *fakeMaintenanceStore) {
	t.Helper()
	store := &fakeMaintenanceStore{items: items}
	muter := NewMaintenanceMuter(store, "org-1", slog.New(slog.DiscardHandler))
	return muter, store
}

// activeFixed builds a fixed-time maintenance window that brackets now.
// ruleIDs scope the window; an empty slice matches every rule.
func activeFixed(ruleIDs ...string) *alertmanagertypes.PlannedMaintenance {
	now := time.Now().UTC()
	return &alertmanagertypes.PlannedMaintenance{
		ID: valuer.GenerateUUID(),
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: now.Add(-time.Hour),
			EndTime:   now.Add(time.Hour),
		},
		RuleIDs: ruleIDs,
	}
}

// futureFixed builds a fixed-time maintenance window that starts in the future.
func futureFixed(ruleIDs ...string) *alertmanagertypes.PlannedMaintenance {
	now := time.Now().UTC()
	return &alertmanagertypes.PlannedMaintenance{
		ID: valuer.GenerateUUID(),
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: now.Add(time.Hour),
			EndTime:   now.Add(2 * time.Hour),
		},
		RuleIDs: ruleIDs,
	}
}

func labelsFor(ruleID string) model.LabelSet {
	return model.LabelSet{model.LabelName(ruletypes.AlertRuleIDLabel): model.LabelValue(ruleID)}
}

func TestMutes_EmptyRuleIDLabel(t *testing.T) {
	muter, store := newMuter(t, activeFixed())
	assert.False(t, muter.Mutes(context.Background(), model.LabelSet{}))
	// Short-circuit: no store lookup needed when the label is missing.
	assert.Equal(t, 0, store.callCount())
}

func TestMutes_NoMaintenanceWindows(t *testing.T) {
	muter, _ := newMuter(t)
	assert.False(t, muter.Mutes(context.Background(), labelsFor("rule-1")))
}

func TestMutes_MatchingRule(t *testing.T) {
	mw := activeFixed("rule-1", "rule-2")
	muter, _ := newMuter(t, mw)
	assert.True(t, muter.Mutes(context.Background(), labelsFor("rule-1")))
	assert.True(t, muter.Mutes(context.Background(), labelsFor("rule-2")))
}

func TestMutes_NonMatchingRule(t *testing.T) {
	muter, _ := newMuter(t, activeFixed("rule-1"))
	assert.False(t, muter.Mutes(context.Background(), labelsFor("rule-other")))
}

func TestMutes_EmptyRuleIDsMatchesAllRules(t *testing.T) {
	// A maintenance with no RuleIDs is treated as scoping every rule.
	muter, _ := newMuter(t, activeFixed())
	assert.True(t, muter.Mutes(context.Background(), labelsFor("any-rule")))
}

func TestMutes_FutureWindowDoesNotMute(t *testing.T) {
	muter, _ := newMuter(t, futureFixed("rule-1"))
	assert.False(t, muter.Mutes(context.Background(), labelsFor("rule-1")))
}

func TestMutes_AnyOfMultipleWindowsMatches(t *testing.T) {
	muter, _ := newMuter(t,
		futureFixed("rule-1"),
		activeFixed("rule-1"),
	)
	assert.True(t, muter.Mutes(context.Background(), labelsFor("rule-1")))
}

func TestMutedBy_EmptyRuleIDLabel(t *testing.T) {
	muter, store := newMuter(t, activeFixed())
	assert.Nil(t, muter.MutedBy(context.Background(), model.LabelSet{}))
	assert.Equal(t, 0, store.callCount())
}

func TestMutedBy_NoMatches(t *testing.T) {
	muter, _ := newMuter(t, activeFixed("rule-1"), futureFixed("rule-1"))
	assert.Nil(t, muter.MutedBy(context.Background(), labelsFor("rule-other")))
}

func TestMutedBy_ReturnsIDsOfAllActiveMatchingWindows(t *testing.T) {
	mw1 := activeFixed("rule-1")
	mw2 := activeFixed() // matches all rules
	mw3 := futureFixed("rule-1")
	mw4 := activeFixed("rule-other")

	muter, _ := newMuter(t, mw1, mw2, mw3, mw4)
	ids := muter.MutedBy(context.Background(), labelsFor("rule-1"))

	want := []string{mw1.ID.String(), mw2.ID.String()}
	sort.Strings(want)
	sort.Strings(ids)
	assert.Equal(t, want, ids)
}

func TestCache_RepeatedCallsHitStoreOnce(t *testing.T) {
	muter, store := newMuter(t, activeFixed("rule-1"))
	ctx := context.Background()
	for i := 0; i < 5; i++ {
		require.True(t, muter.Mutes(ctx, labelsFor("rule-1")))
	}
	assert.Equal(t, 1, store.callCount(), "cached results should suppress further store lookups within TTL")
}

func TestCache_StoreErrorReturnsStaleCache(t *testing.T) {
	mw := activeFixed("rule-1")
	muter, store := newMuter(t, mw)
	ctx := context.Background()

	// First call populates the cache from a working store.
	require.True(t, muter.Mutes(ctx, labelsFor("rule-1")))
	require.Equal(t, 1, store.callCount())

	// Force cache to be considered expired so the next call re-fetches.
	muter.mu.Lock()
	muter.cacheExpiry = time.Time{}
	muter.mu.Unlock()

	// Store now errors. The muter should fall back to the previously cached value
	// (i.e. still mute rule-1) rather than returning false.
	store.setError(errors.New("boom"))
	assert.True(t, muter.Mutes(ctx, labelsFor("rule-1")),
		"on store error, muter should keep using the last known cache to avoid losing suppression")
	assert.Equal(t, 2, store.callCount())
}

func TestCache_ExpiredCacheRefetchesUpdatedData(t *testing.T) {
	mw := activeFixed("rule-1")
	muter, store := newMuter(t, mw)
	ctx := context.Background()

	require.True(t, muter.Mutes(ctx, labelsFor("rule-1")))
	require.Equal(t, 1, store.callCount())

	// Drop the maintenance window from the store and expire the cache.
	store.mu.Lock()
	store.items = nil
	store.mu.Unlock()
	muter.mu.Lock()
	muter.cacheExpiry = time.Time{}
	muter.mu.Unlock()

	assert.False(t, muter.Mutes(ctx, labelsFor("rule-1")))
	assert.Equal(t, 2, store.callCount())
}

func TestMutes_IsConcurrencySafe(t *testing.T) {
	muter, store := newMuter(t, activeFixed("rule-1"))
	ctx := context.Background()

	const goroutines = 32
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				_ = muter.Mutes(ctx, labelsFor("rule-1"))
				_ = muter.MutedBy(ctx, labelsFor("rule-1"))
			}
		}()
	}
	wg.Wait()

	// Even under contention the cache must collapse the load to a single fetch.
	assert.Equal(t, 1, store.callCount())
}
