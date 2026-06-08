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
