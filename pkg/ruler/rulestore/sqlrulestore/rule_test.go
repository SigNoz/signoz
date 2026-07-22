package sqlrulestore

import (
	"context"
	"database/sql/driver"
	"errors"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

var errSimulated = errors.New("simulated db error")

func newRuleStoreForTest(t *testing.T) (*sqlstoretest.Provider, *rule) {
	t.Helper()
	s := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)
	settings := factorytest.NewSettings()
	return s, &rule{
		sqlstore:    s,
		queryParser: queryparser.New(settings),
		logger:      settings.Logger,
	}
}

var noop = func(context.Context) error { return nil }

// expectNoSoloWindows sets the mock to return an empty result for the
// solo-window discovery SELECT, meaning no maintenance windows need to be
// cleaned up before deleting the rule.
func expectNoSoloWindows(mock sqlmock.Sqlmock) {
	mock.ExpectQuery(`planned_maintenance_rule`).
		WillReturnRows(sqlmock.NewRows([]string{"planned_maintenance_id"}))
}

// TestDeleteRule_CascadesMaintenanceRules verifies that deleting a rule first
// removes its rows from planned_maintenance_rule, then removes the rule itself.
func TestDeleteRule_CascadesMaintenanceRules(t *testing.T) {
	store, rs := newRuleStoreForTest(t)
	ruleID := valuer.GenerateUUID()

	// Solo-window check: no windows would be left empty.
	expectNoSoloWindows(store.Mock())

	// Remaining association rows removed.
	store.Mock().ExpectExec(`planned_maintenance_rule`).
		WillReturnResult(driver.ResultNoRows)

	// Rule record removed.
	store.Mock().ExpectExec(`FROM "rule"`).
		WillReturnResult(driver.ResultNoRows)

	err := rs.DeleteRule(context.Background(), ruleID, noop)
	require.NoError(t, err)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}

// TestDeleteRule_OrphanedWindowsDeletedWithRule verifies that when a rule is
// the sole member of a maintenance window, that window and its junction rows
// are deleted in the same transaction as the rule.
func TestDeleteRule_OrphanedWindowsDeletedWithRule(t *testing.T) {
	store, rs := newRuleStoreForTest(t)
	ruleID := valuer.GenerateUUID()
	windowID := valuer.GenerateUUID().StringValue()

	// Solo-window SELECT returns one window.
	store.Mock().ExpectQuery(`planned_maintenance_rule`).
		WillReturnRows(sqlmock.NewRows([]string{"planned_maintenance_id"}).AddRow(windowID))

	// Orphaned junction rows deleted.
	store.Mock().ExpectExec(`planned_maintenance_rule`).
		WillReturnResult(driver.ResultNoRows)

	// Orphaned maintenance window deleted.
	store.Mock().ExpectExec(`planned_maintenance`).
		WillReturnResult(driver.ResultNoRows)

	// Remaining associations for this rule deleted.
	store.Mock().ExpectExec(`planned_maintenance_rule`).
		WillReturnResult(driver.ResultNoRows)

	// Rule itself deleted.
	store.Mock().ExpectExec(`FROM "rule"`).
		WillReturnResult(driver.ResultNoRows)

	err := rs.DeleteRule(context.Background(), ruleID, noop)
	require.NoError(t, err)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}

// TestDeleteRule_JunctionDeleteFailureAborts verifies that if the
// association-row delete fails, the rule record is not deleted.
func TestDeleteRule_JunctionDeleteFailureAborts(t *testing.T) {
	store, rs := newRuleStoreForTest(t)

	expectNoSoloWindows(store.Mock())

	store.Mock().ExpectExec(`planned_maintenance_rule`).
		WillReturnError(errSimulated)

	err := rs.DeleteRule(context.Background(), valuer.GenerateUUID(), noop)
	require.Error(t, err)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}

// TestDeleteRule_CallbackInvokedAfterDeletes verifies that the caller-supplied
// callback runs only after both deletes succeed.
func TestDeleteRule_CallbackInvokedAfterDeletes(t *testing.T) {
	store, rs := newRuleStoreForTest(t)
	ruleID := valuer.GenerateUUID()

	expectNoSoloWindows(store.Mock())
	store.Mock().ExpectExec(`planned_maintenance_rule`).WillReturnResult(driver.ResultNoRows)
	store.Mock().ExpectExec(`FROM "rule"`).WillReturnResult(driver.ResultNoRows)

	called := false
	err := rs.DeleteRule(context.Background(), ruleID, func(ctx context.Context) error {
		called = true
		return nil
	})
	require.NoError(t, err)
	require.True(t, called)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}
