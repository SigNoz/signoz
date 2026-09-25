package sqlalertmanagerstore

import (
	"context"
	"database/sql/driver"
	"errors"
	"path/filepath"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
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

var errSimulated = errors.New("simulated db error")

func newMaintenanceStoreForTest(t *testing.T) (*sqlstoretest.Provider, *maintenance) {
	t.Helper()
	s := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)
	return s, &maintenance{sqlstore: s}
}

func ctxWithOrgClaims(orgID string) context.Context {
	return authtypes.NewContextWithClaims(context.Background(), authtypes.Claims{
		OrgID: orgID,
		Email: "test@example.com",
	})
}

// TestDeletePlannedMaintenance_CascadesJunctionRows verifies the deletion
// sequence: ownership EXISTS check → cascade junction rows → delete parent.
func TestDeletePlannedMaintenance_CascadesJunctionRows(t *testing.T) {
	store, ms := newMaintenanceStoreForTest(t)
	maintenanceID := valuer.GenerateUUID()

	// 1. Ownership check (EXISTS query).
	store.Mock().ExpectQuery(`EXISTS`).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	// 2. Cascade-delete junction rows.
	store.Mock().ExpectExec(`planned_maintenance_rule`).
		WillReturnResult(driver.ResultNoRows)

	// 3. Delete parent record scoped to org.
	store.Mock().ExpectExec(`planned_maintenance`).
		WillReturnResult(driver.ResultNoRows)

	err := ms.DeletePlannedMaintenance(ctxWithOrgClaims("org-1"), maintenanceID)
	require.NoError(t, err)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}

// TestDeletePlannedMaintenance_WrongOrgReturnsNotFound verifies that supplying
// an ID owned by another org returns a not-found error and performs no deletes.
func TestDeletePlannedMaintenance_WrongOrgReturnsNotFound(t *testing.T) {
	store, ms := newMaintenanceStoreForTest(t)

	// EXISTS returns false (wrong org).
	store.Mock().ExpectQuery(`EXISTS`).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	err := ms.DeletePlannedMaintenance(ctxWithOrgClaims("org-1"), valuer.GenerateUUID())
	require.Error(t, err)
	// No further expectations — confirms no DELETE was attempted.
	require.NoError(t, store.Mock().ExpectationsWereMet())
}

// TestDeletePlannedMaintenance_NoClaimsReturnsError verifies that a context
// without auth claims returns an error before touching the database.
func TestDeletePlannedMaintenance_NoClaimsReturnsError(t *testing.T) {
	_, ms := newMaintenanceStoreForTest(t)
	err := ms.DeletePlannedMaintenance(context.Background(), valuer.GenerateUUID())
	require.Error(t, err)
}

// TestDeletePlannedMaintenance_JunctionDeleteFailureAborts verifies that if the
// junction-row delete fails, the parent record is not deleted.
func TestDeletePlannedMaintenance_JunctionDeleteFailureAborts(t *testing.T) {
	store, ms := newMaintenanceStoreForTest(t)

	store.Mock().ExpectQuery(`EXISTS`).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	store.Mock().ExpectExec(`planned_maintenance_rule`).
		WillReturnError(errSimulated)

	err := ms.DeletePlannedMaintenance(ctxWithOrgClaims("org-1"), valuer.GenerateUUID())
	require.Error(t, err)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}