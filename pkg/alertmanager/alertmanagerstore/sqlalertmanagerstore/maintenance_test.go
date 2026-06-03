package sqlalertmanagerstore

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	store, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
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
		Exec(context.Background())
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*alertmanagertypes.StorablePlannedMaintenanceRule)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	return store
}

// TestListPlannedMaintenanceSkipsInvalid asserts that a single corrupt record
// (here, an unloadable timezone) is skipped rather than failing the whole list.
func TestListPlannedMaintenanceSkipsInvalid(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)
	orgID := valuer.GenerateUUID().StringValue()
	now := time.Now().UTC()

	valid := &alertmanagertypes.StorablePlannedMaintenance{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          "valid",
		Schedule: `{
			"timezone": "utc",
			"startTime": "2024-01-01T12:00:00Z",
			"recurrence": {
				"duration": "2h",
				"repeatType": "daily"
			}
		}`,
		OrgID: orgID,
	}
	_, err := store.BunDB().NewInsert().Model(valid).Exec(ctx)
	require.NoError(t, err)

	ruleID := valuer.GenerateUUID()
	rule := &alertmanagertypes.StorablePlannedMaintenanceRule{
		Identifiable:         types.Identifiable{ID: valuer.GenerateUUID()},
		PlannedMaintenanceID: valid.ID,
		RuleID:               ruleID,
	}
	_, err = store.BunDB().NewInsert().Model(rule).Exec(ctx)
	require.NoError(t, err)

	// A schedule whose timezone cannot be loaded — Schedule.Scan errors on it.
	invalid := &alertmanagertypes.StorablePlannedMaintenance{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
		Name:     "invalid",
		Schedule: `{"timezone":"Mars/Phobos","startTime":"2024-01-01T12:00:00Z","recurrence":{"duration":"2h","repeatType":"daily"}}`,
		OrgID:    orgID,
	}
	_, err = store.BunDB().NewInsert().Model(invalid).Exec(ctx)
	require.NoError(t, err)

	ruleID2 := valuer.GenerateUUID()
	rule2 := &alertmanagertypes.StorablePlannedMaintenanceRule{
		Identifiable:         types.Identifiable{ID: valuer.GenerateUUID()},
		PlannedMaintenanceID: invalid.ID,
		RuleID:               ruleID2,
	}
	_, err = store.BunDB().NewInsert().Model(rule2).Exec(ctx)

	maintenanceStore := NewMaintenanceStore(store, factorytest.NewSettings())

	list, err := maintenanceStore.ListPlannedMaintenance(ctx, orgID)
	require.NoError(t, err)
	require.Len(t, list, 1)
	assert.Equal(t, valid.ID, list[0].ID)
	assert.Equal(t, []string{ruleID.StringValue()}, list[0].RuleIDs)
}
