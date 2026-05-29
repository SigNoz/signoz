package sqlrulestore

import (
	"context"
	"database/sql/driver"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func newMaintenanceStoreForTest(t *testing.T) (store *sqlstoretest.Provider, ms *maintenance) {
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

// TestDeletePlannedMaintenance_CascadesJunctionRows verifies that deleting a
// maintenance window first removes rows from planned_maintenance_rule using the
// correct column name (planned_maintenance_id, not maintenance_id), then removes
// the parent record scoped to the caller's org.
func TestDeletePlannedMaintenance_CascadesJunctionRows(t *testing.T) {
	store, ms := newMaintenanceStoreForTest(t)
	orgID := "test-org-id"
	maintenanceID := valuer.GenerateUUID()

	// Expect junction-row delete with the correct column name.
	// This is the regression guard: the original bug used "maintenance_id".
	// Bun embeds values directly (no ? placeholders) for SQLite, so no WithArgs.
	store.Mock().ExpectExec(`planned_maintenance_id`).
		WillReturnResult(driver.ResultNoRows)

	// Expect parent delete scoped to org_id (org_id only appears in this query).
	store.Mock().ExpectExec(`org_id`).
		WillReturnResult(driver.ResultNoRows)

	err := ms.DeletePlannedMaintenance(ctxWithOrgClaims(orgID), maintenanceID)
	require.NoError(t, err)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}

// TestDeletePlannedMaintenance_NoClaimsReturnsError verifies that the function
// returns an error when the context carries no auth claims.
func TestDeletePlannedMaintenance_NoClaimsReturnsError(t *testing.T) {
	_, ms := newMaintenanceStoreForTest(t)
	err := ms.DeletePlannedMaintenance(context.Background(), valuer.GenerateUUID())
	require.Error(t, err)
}

// TestDeletePlannedMaintenance_JunctionDeleteFailureAborts verifies that if
// deleting the junction rows fails the parent record is not deleted.
func TestDeletePlannedMaintenance_JunctionDeleteFailureAborts(t *testing.T) {
	store, ms := newMaintenanceStoreForTest(t)
	orgID := "test-org-id"

	store.Mock().ExpectExec(`planned_maintenance_id`).
		WillReturnError(errSimulated)

	err := ms.DeletePlannedMaintenance(ctxWithOrgClaims(orgID), valuer.GenerateUUID())
	require.Error(t, err)
	// No further expectations, so ExpectationsWereMet confirms the parent
	// delete was never attempted.
	require.NoError(t, store.Mock().ExpectationsWereMet())
}
