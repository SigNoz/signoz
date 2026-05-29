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

func newRuleStoreForTest(t *testing.T) (store *sqlstoretest.Provider, rs *rule) {
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

// TestDeleteRule_CascadesMaintenanceRules verifies that deleting a rule first
// removes its rows from planned_maintenance_rule (by rule_id), then removes the
// rule itself — both inside the same transaction callback.
func TestDeleteRule_CascadesMaintenanceRules(t *testing.T) {
	store, rs := newRuleStoreForTest(t)
	ruleID := valuer.GenerateUUID()

	// Junction rows removed first. Bun embeds values directly for SQLite — no WithArgs.
	store.Mock().ExpectExec(`rule_id`).
		WillReturnResult(driver.ResultNoRows)

	// Rule itself removed second. Match the table name to distinguish from planned_maintenance_rule.
	store.Mock().ExpectExec(`FROM "rule"`).
		WillReturnResult(driver.ResultNoRows)

	err := rs.DeleteRule(context.Background(), ruleID, noop)
	require.NoError(t, err)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}

// TestDeleteRule_JunctionDeleteFailureAborts verifies that if the junction-row
// delete fails, the rule record is not deleted.
func TestDeleteRule_JunctionDeleteFailureAborts(t *testing.T) {
	store, rs := newRuleStoreForTest(t)

	store.Mock().ExpectExec(`rule_id`).
		WillReturnError(errSimulated)

	err := rs.DeleteRule(context.Background(), valuer.GenerateUUID(), noop)
	require.Error(t, err)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}

// TestDeleteRule_CallbackCalledAfterDeletes verifies that the caller-supplied
// callback is invoked (allowing the caller to perform additional cleanup) only
// after both deletes succeed.
func TestDeleteRule_CallbackCalledAfterDeletes(t *testing.T) {
	store, rs := newRuleStoreForTest(t)
	ruleID := valuer.GenerateUUID()

	store.Mock().ExpectExec(`rule_id`).
		WillReturnResult(driver.ResultNoRows)
	store.Mock().ExpectExec(`FROM "rule"`).
		WillReturnResult(driver.ResultNoRows)

	called := false
	err := rs.DeleteRule(context.Background(), ruleID, func(ctx context.Context) error {
		called = true
		return nil
	})
	require.NoError(t, err)
	require.True(t, called)
	require.NoError(t, store.Mock().ExpectationsWereMet())
}
