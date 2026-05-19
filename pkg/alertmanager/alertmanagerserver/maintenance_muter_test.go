package alertmanagerserver

import (
	"context"
	"log/slog"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes/alertmanagertypestest"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func newMuter(store alertmanagertypes.MaintenanceStore) *MaintenanceMuter {
	return NewMaintenanceMuter(store, "org-1", slog.New(slog.DiscardHandler))
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
	return model.LabelSet{ruletypes.AlertRuleIDLabel: model.LabelValue(ruleID)}
}

func TestMutes_EmptyRuleIDLabel(t *testing.T) {
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	muter := newMuter(store)
	assert.False(t, muter.Mutes(context.Background(), model.LabelSet{}))
	// Short-circuit: no store lookup needed when the label is missing.
	store.AssertNotCalled(t, "ListPlannedMaintenance")
}

func TestMutes_NoMaintenanceWindows(t *testing.T) {
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return([]*alertmanagertypes.PlannedMaintenance(nil), nil)
	muter := newMuter(store)
	assert.False(t, muter.Mutes(context.Background(), labelsFor("rule-1")))
}

func TestMutes_MaintenanceWindowWithRules(t *testing.T) {
	mw := activeFixed("rule-1", "rule-2")
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return([]*alertmanagertypes.PlannedMaintenance{mw}, nil)
	muter := newMuter(store)
	assert.True(t, muter.Mutes(context.Background(), labelsFor("rule-1")))
	assert.True(t, muter.Mutes(context.Background(), labelsFor("rule-2")))
	assert.False(t, muter.Mutes(context.Background(), labelsFor("rule-3")))
}

func TestMutes_EmptyRuleIDsMatchesAllRules(t *testing.T) {
	// A maintenance with no RuleIDs is treated as scoping every rule.
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return([]*alertmanagertypes.PlannedMaintenance{activeFixed()}, nil)
	muter := newMuter(store)
	assert.True(t, muter.Mutes(context.Background(), labelsFor("any-rule")))
}

func TestMutes_FutureWindowDoesNotMute(t *testing.T) {
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return([]*alertmanagertypes.PlannedMaintenance{futureFixed("rule-1")}, nil)
	muter := newMuter(store)
	assert.False(t, muter.Mutes(context.Background(), labelsFor("rule-1")))
}

func TestMutes_AnyOfMultipleWindowsMatches(t *testing.T) {
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		[]*alertmanagertypes.PlannedMaintenance{futureFixed("rule-1"), activeFixed("rule-1")}, nil,
	)
	muter := newMuter(store)
	assert.True(t, muter.Mutes(context.Background(), labelsFor("rule-1")))
}

func TestMutedBy_EmptyRuleIDLabel(t *testing.T) {
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	muter := newMuter(store)
	assert.Nil(t, muter.MutedBy(context.Background(), model.LabelSet{}))
	store.AssertNotCalled(t, "ListPlannedMaintenance")
}

func TestMutedBy_NoMatches(t *testing.T) {
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		[]*alertmanagertypes.PlannedMaintenance{activeFixed("rule-1"), futureFixed("rule-1")}, nil,
	)
	muter := newMuter(store)
	assert.Nil(t, muter.MutedBy(context.Background(), labelsFor("rule-other")))
}

func TestMutedBy_ReturnsIDsOfAllActiveMatchingWindows(t *testing.T) {
	mw1 := activeFixed("rule-1")
	mw2 := activeFixed() // matches all rules
	mw3 := futureFixed("rule-1")
	mw4 := activeFixed("rule-other")

	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		[]*alertmanagertypes.PlannedMaintenance{mw1, mw2, mw3, mw4}, nil,
	)
	muter := newMuter(store)
	ids := muter.MutedBy(context.Background(), labelsFor("rule-1"))

	want := []string{mw1.ID.String(), mw2.ID.String()}
	sort.Strings(want)
	sort.Strings(ids)
	assert.Equal(t, want, ids)
}

func TestCache_RepeatedCallsHitStoreOnce(t *testing.T) {
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		[]*alertmanagertypes.PlannedMaintenance{activeFixed("rule-1")}, nil,
	)
	muter := newMuter(store)
	ctx := context.Background()
	for i := 0; i < 5; i++ {
		require.True(t, muter.Mutes(ctx, labelsFor("rule-1")))
	}
	store.AssertNumberOfCalls(t, "ListPlannedMaintenance", 1)
}

func TestCache_StoreErrorReturnsStaleCache(t *testing.T) {
	mw := activeFixed("rule-1")
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		[]*alertmanagertypes.PlannedMaintenance{mw}, nil,
	).Once()
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		([]*alertmanagertypes.PlannedMaintenance)(nil),
		errors.New(errors.TypeInternal, errors.MustNewCode("internal_error"), "boom"),
	).Once()

	ctx := context.Background()
	muter := newMuter(store)

	// First call populates the cache from a working store.
	require.True(t, muter.Mutes(ctx, labelsFor("rule-1")))

	// Force cache to be considered expired so the next call re-fetches.
	muter.mu.Lock()
	muter.cacheExpiry = time.Time{}
	muter.mu.Unlock()

	// Store now errors. The muter should fall back to the previously cached value
	// (i.e. still mute rule-1) rather than returning false.
	assert.True(t, muter.Mutes(ctx, labelsFor("rule-1")),
		"on store error, muter should keep using the last known cache to avoid losing suppression")
	store.AssertNumberOfCalls(t, "ListPlannedMaintenance", 2)
}

func TestCache_ExpiredCacheRefetchesUpdatedData(t *testing.T) {
	mw := activeFixed("rule-1")
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		[]*alertmanagertypes.PlannedMaintenance{mw}, nil,
	).Once()
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		([]*alertmanagertypes.PlannedMaintenance)(nil), nil,
	).Once()

	ctx := context.Background()
	muter := newMuter(store)

	require.True(t, muter.Mutes(ctx, labelsFor("rule-1")))

	// Expire the cache and let the store return an empty list.
	muter.mu.Lock()
	muter.cacheExpiry = time.Time{}
	muter.mu.Unlock()

	assert.False(t, muter.Mutes(ctx, labelsFor("rule-1")))
	store.AssertNumberOfCalls(t, "ListPlannedMaintenance", 2)
}

func TestMutes_IsConcurrencySafe(t *testing.T) {
	store := alertmanagertypestest.NewMockMaintenanceStore(t)
	store.On("ListPlannedMaintenance", mock.Anything, "org-1").Return(
		[]*alertmanagertypes.PlannedMaintenance{activeFixed("rule-1")}, nil,
	)
	muter := newMuter(store)
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
	store.AssertNumberOfCalls(t, "ListPlannedMaintenance", 1)
}
