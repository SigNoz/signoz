package sqlalertmanagerstore

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func newTestStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	store, err := sqlitesqlstore.New(t.Context(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "test.db"),
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*alertmanagertypes.StorablePlannedMaintenance)(nil)).
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*alertmanagertypes.StorablePlannedMaintenanceRule)(nil)).
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	return store
}

// TestListPlannedMaintenanceSkipsInvalid asserts that a single corrupt record
// (here, an unloadable timezone) is skipped rather than failing the whole list.
func TestListPlannedMaintenanceSkipsInvalid(t *testing.T) {
	store := newTestStore(t)
	orgID := valuer.GenerateUUID().StringValue()
	now := time.Now().UTC()

	valid := &alertmanagertypes.StorablePlannedMaintenance{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          "valid",
		Schedule:      `{"timezone":"UTC","startTime":"2024-01-01T12:00:00Z","recurrence":{"duration":"2h","repeatType":"daily"}}`,
		OrgID:         orgID,
	}
	result, err := store.BunDB().NewInsert().Model(valid).Exec(t.Context())
	require.NoError(t, err)
	rowsAffected, err := result.RowsAffected()
	require.NoError(t, err)
	require.Equal(t, int64(1), rowsAffected)

	// A schedule with "zero" startTime
	invalid := &alertmanagertypes.StorablePlannedMaintenance{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
		Name:     "invalid",
		Schedule: `{"timezone":"UTC","recurrence":{"duration":"2h","repeatType":"daily"}}`,
		OrgID:    orgID,
	}
	result, err = store.BunDB().NewInsert().Model(invalid).Exec(t.Context())
	require.NoError(t, err)
	rowsAffected, err = result.RowsAffected()
	require.NoError(t, err)
	require.Equal(t, int64(1), rowsAffected)

	maintenanceStore := NewMaintenanceStore(store, factorytest.NewSettings())

	list, err := maintenanceStore.ListPlannedMaintenance(t.Context(), orgID)
	require.NoError(t, err)
	require.Len(t, list, 1)
	assert.Equal(t, valid.ID, list[0].ID)
}

func TestAdhocPlannedMaintenanceLifecycle(t *testing.T) {
	store := newTestStore(t)
	maintenanceStore := NewMaintenanceStore(store, factorytest.NewSettings())
	orgID := valuer.GenerateUUID().StringValue()
	ruleID := valuer.GenerateUUID()
	otherRuleID := valuer.GenerateUUID()
	ctx := authtypes.NewContextWithClaims(t.Context(), authtypes.Claims{OrgID: orgID, Email: "nikhil@signoz.io"})

	t.Run("Upsert_NoExistingRow_CreatesRowAndJoin", func(t *testing.T) {
		created, err := maintenanceStore.UpsertAdhocPlannedMaintenance(ctx, ruleID, "payment latency high", time.Now().UTC().Add(time.Hour))
		require.NoError(t, err)

		assert.Equal(t, alertmanagertypes.MaintenanceOriginAdhoc, created.Origin)
		assert.Equal(t, "Mute: payment latency high", created.Name)
		assert.Equal(t, "nikhil@signoz.io", created.CreatedBy)
		require.Len(t, created.RuleIDs, 1)
		assert.Equal(t, ruleID.StringValue(), created.RuleIDs[0])
	})

	t.Run("Upsert_ActiveRowExists_ReplacesEndTimeKeepsStart", func(t *testing.T) {
		before, err := maintenanceStore.ListAdhocPlannedMaintenanceByRule(ctx, orgID, ruleID)
		require.NoError(t, err)
		require.Len(t, before, 1)

		updated, err := maintenanceStore.UpsertAdhocPlannedMaintenance(ctx, ruleID, "payment latency high", time.Now().UTC().Add(4*time.Hour))
		require.NoError(t, err)

		assert.Equal(t, before[0].ID, updated.ID, "re-mute must reuse the row")
		assert.True(t, updated.Schedule.StartTime.Equal(before[0].Schedule.StartTime), "active re-mute keeps the original start")
		assert.True(t, updated.Schedule.EndTime.After(before[0].Schedule.EndTime), "end time must move out")

		all, err := maintenanceStore.ListAdhocPlannedMaintenanceByRule(ctx, orgID, ruleID)
		require.NoError(t, err)
		assert.Len(t, all, 1)
	})

	t.Run("Upsert_ExpiredRowExists_ReusesRowWithFreshStart", func(t *testing.T) {
		expiredSchedule := `{"timezone":"UTC","startTime":"2020-01-01T00:00:00Z","endTime":"2020-01-01T01:00:00Z"}`
		_, err := store.BunDB().NewUpdate().
			Model((*alertmanagertypes.StorablePlannedMaintenance)(nil)).
			Set("schedule = ?", expiredSchedule).
			Where("origin = ?", alertmanagertypes.MaintenanceOriginAdhoc).
			Exec(t.Context())
		require.NoError(t, err)

		revived, err := maintenanceStore.UpsertAdhocPlannedMaintenance(ctx, ruleID, "payment latency high", time.Time{})
		require.NoError(t, err)

		assert.True(t, revived.Schedule.StartTime.After(time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)), "expired re-mute restarts now")
		assert.True(t, revived.Schedule.EndTime.IsZero(), "indefinite mute stores no end time")
		assert.True(t, revived.IsActive(time.Now().UTC()))
	})

	t.Run("Delete_RemovesJoinAndRow_ReportsCount", func(t *testing.T) {
		deleted, err := maintenanceStore.DeleteAdhocPlannedMaintenanceByRule(ctx, orgID, ruleID)
		require.NoError(t, err)
		assert.Equal(t, int64(1), deleted)

		remaining, err := maintenanceStore.ListAdhocPlannedMaintenanceByRule(ctx, orgID, ruleID)
		require.NoError(t, err)
		assert.Empty(t, remaining)

		joinRows := 0
		joinRows, err = store.BunDB().NewSelect().Model((*alertmanagertypes.StorablePlannedMaintenanceRule)(nil)).Count(t.Context())
		require.NoError(t, err)
		assert.Zero(t, joinRows)
	})

	t.Run("Delete_NothingToDelete_ReportsZero", func(t *testing.T) {
		deleted, err := maintenanceStore.DeleteAdhocPlannedMaintenanceByRule(ctx, orgID, ruleID)
		require.NoError(t, err)
		assert.Zero(t, deleted)
	})

	t.Run("List_FiltersByRuleAndOrigin", func(t *testing.T) {
		_, err := maintenanceStore.UpsertAdhocPlannedMaintenance(ctx, ruleID, "payment latency high", time.Time{})
		require.NoError(t, err)
		_, err = maintenanceStore.UpsertAdhocPlannedMaintenance(ctx, otherRuleID, "other rule", time.Time{})
		require.NoError(t, err)

		forRule, err := maintenanceStore.ListAdhocPlannedMaintenanceByRule(ctx, orgID, ruleID)
		require.NoError(t, err)
		require.Len(t, forRule, 1)
		assert.Equal(t, []string{ruleID.StringValue()}, forRule[0].RuleIDs)

		otherOrg, err := maintenanceStore.ListAdhocPlannedMaintenanceByRule(ctx, valuer.GenerateUUID().StringValue(), ruleID)
		require.NoError(t, err)
		assert.Empty(t, otherOrg)
	})
}

// Pins the create-response carrying the stored origin; the integration suite
// caught it missing while list/get had it.
func TestCreatePlannedMaintenanceStampsOrigin(t *testing.T) {
	store := newTestStore(t)
	maintenanceStore := NewMaintenanceStore(store, factorytest.NewSettings())
	ctx := authtypes.NewContextWithClaims(t.Context(), authtypes.Claims{OrgID: valuer.GenerateUUID().StringValue(), Email: "nikhil@signoz.io"})

	created, err := maintenanceStore.CreatePlannedMaintenance(ctx, &alertmanagertypes.PostablePlannedMaintenance{
		Name:     "window",
		Schedule: &alertmanagertypes.Schedule{Timezone: "UTC", StartTime: time.Now().UTC(), EndTime: time.Now().UTC().Add(time.Hour)},
	})
	require.NoError(t, err)
	assert.Equal(t, alertmanagertypes.MaintenanceOriginMaintenance, created.Origin)
}
