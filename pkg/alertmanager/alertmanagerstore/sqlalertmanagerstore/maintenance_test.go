package sqlalertmanagerstore

import (
	"context"
	"database/sql/driver"
	"errors"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

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
