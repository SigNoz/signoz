package sqlmigration

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/require"
)

// Before migration (affected org): serviceaccount/* read exists, update/delete/detach
// and factor-api-key update/delete are missing, so GET passes but PUT/DELETE fail.
// After migration all 19 admin wildcards below must exist.
func TestRepairSaFactorKeyTuples_CountAndScope(t *testing.T) {
	tuples := repairSaFactorKeyTuples()

	// 7 SA + 5 factor-api-key + 7 role = 19.
	require.Len(t, tuples, 19)

	byKey := make(map[string]int, len(tuples))
	for _, tuple := range tuples {
		require.Equal(t, authtypes.SigNozAdminRoleName, tuple.roleName)
		key := tuple.objectType + ":" + tuple.objectName + "#" + tuple.relation
		byKey[key]++
	}

	expected := []string{
		// serviceaccount/serviceaccount
		"serviceaccount:serviceaccount#attach",
		"serviceaccount:serviceaccount#detach",
		"serviceaccount:serviceaccount#read",
		"serviceaccount:serviceaccount#update",
		"serviceaccount:serviceaccount#delete",
		"serviceaccount:serviceaccount#create",
		"serviceaccount:serviceaccount#list",
		// metaresource/factor-api-key
		"metaresource:factor-api-key#read",
		"metaresource:factor-api-key#update",
		"metaresource:factor-api-key#delete",
		"metaresource:factor-api-key#create",
		"metaresource:factor-api-key#list",
		// role/role
		"role:role#attach",
		"role:role#detach",
		"role:role#read",
		"role:role#update",
		"role:role#delete",
		"role:role#create",
		"role:role#list",
	}
	for _, key := range expected {
		require.Equal(t, 1, byKey[key], "missing or duplicated tuple %s", key)
	}
	require.Len(t, byKey, len(expected), "repair must not add unrelated permissions")
}

// Every generated tuple must correspond to a current
// ManagedRoleToTransactions[signoz-admin] entry, proving the migration tracks
// the registry instead of drifting with a hardcoded list.
func TestRepairSaFactorKeyTuples_MatchesRegistry(t *testing.T) {
	tuples := repairSaFactorKeyTuples()

	registryKeys := make(map[string]struct{})
	for _, txn := range coretypes.ManagedRoleToTransactions[authtypes.SigNozAdminRoleName] {
		key := txn.Object.Resource.Type.StringValue() + ":" + txn.Object.Resource.Kind.String() + "#" + txn.Verb.StringValue()
		registryKeys[key] = struct{}{}
	}

	for _, tuple := range tuples {
		key := tuple.objectType + ":" + tuple.objectName + "#" + tuple.relation
		_, ok := registryKeys[key]
		require.True(t, ok, "generated tuple %s not in current registry", key)
	}
}

// The repair must never create per-resource object tuples: all inserts are
// organization-level wildcard ("*") managed-role grants, matching
// getManagedRoleTransactionTuples.
func TestRepairSaFactorKeyTuples_NoPerInstanceTuples(t *testing.T) {
	for _, txn := range coretypes.ManagedRoleToTransactions[authtypes.SigNozAdminRoleName] {
		t := txn.Object.Resource.Type.StringValue() + ":" + txn.Object.Resource.Kind.String()
		if t != "serviceaccount:serviceaccount" && t != "metaresource:factor-api-key" && t != "role:role" {
			continue
		}
		require.Equal(t, coretypes.WildCardSelectorString, txn.Object.Selector.String())
	}

	for _, tuple := range repairSaFactorKeyTuples() {
		require.NotContains(t, tuple.objectName, "/", "objectName must be a kind, not an id: %v", tuple)
		require.NotEmpty(t, tuple.objectType)
		require.NotEmpty(t, tuple.relation)
	}
}

// Generation must be deterministic so re-running the migration converges.
func TestRepairSaFactorKeyTuples_Deterministic(t *testing.T) {
	first := repairSaFactorKeyTuples()
	second := repairSaFactorKeyTuples()
	require.Equal(t, first, second)
}

// Explicitly covers the failing endpoints from #13016 plus the DELETE-key
// parent detach check.
func TestRepairSaFactorKeyTuples_CoversIssueEndpoints(t *testing.T) {
	present := make(map[string]bool)
	for _, tuple := range repairSaFactorKeyTuples() {
		present[tuple.objectType+":"+tuple.objectName+"#"+tuple.relation] = true
	}

	// GET SA, PUT SA, DELETE SA
	require.True(t, present["serviceaccount:serviceaccount#read"])
	require.True(t, present["serviceaccount:serviceaccount#update"])
	require.True(t, present["serviceaccount:serviceaccount#delete"])
	// PUT key, DELETE key
	require.True(t, present["metaresource:factor-api-key#update"])
	require.True(t, present["metaresource:factor-api-key#delete"])
	require.True(t, present["metaresource:factor-api-key#read"])
	// DELETE key parent detach
	require.True(t, present["serviceaccount:serviceaccount#detach"])
}

// ---------------------------------------------------------------------------
// Migration-level regression tests for Up() via sqlmock.
//
// These execute repairSaFactorKeyWildcards.Up against a mocked bun.DB and
// verify the actual SQL/arguments — not just repairSaFactorKeyTuples().
// Pattern follows pkg/authz/openfgaserver/server_test.go +
// pkg/sqlstore/sqlstoretest provider. No new framework.
// ---------------------------------------------------------------------------

// expectedRepairTuples is intentionally hardcoded (not derived from
// repairSaFactorKeyTuples) so the Up() test proves the real SQL path emits the
// 19 expected wildcards instead of comparing the helper to itself.
var expectedRepairTuples = []migrationTuple{
	{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "create"},
	{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "delete"},
	{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "list"},
	{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "read"},
	{authtypes.SigNozAdminRoleName, "metaresource", "factor-api-key", "update"},
	{authtypes.SigNozAdminRoleName, "role", "role", "attach"},
	{authtypes.SigNozAdminRoleName, "role", "role", "create"},
	{authtypes.SigNozAdminRoleName, "role", "role", "delete"},
	{authtypes.SigNozAdminRoleName, "role", "role", "detach"},
	{authtypes.SigNozAdminRoleName, "role", "role", "list"},
	{authtypes.SigNozAdminRoleName, "role", "role", "read"},
	{authtypes.SigNozAdminRoleName, "role", "role", "update"},
	{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "attach"},
	{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "create"},
	{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "delete"},
	{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "detach"},
	{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "list"},
	{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "read"},
	{authtypes.SigNozAdminRoleName, "serviceaccount", "serviceaccount", "update"},
}

func expectStoreAndOrgs(mock sqlmock.Sqlmock, storeID string, orgIDs []string) {
	storeRows := mock.NewRows([]string{"id"}).AddRow(storeID)
	mock.ExpectQuery("SELECT id FROM store").WithArgs("signoz").WillReturnRows(storeRows)

	orgRows := mock.NewRows([]string{"id"})
	for _, orgID := range orgIDs {
		orgRows.AddRow(orgID)
	}
	mock.ExpectQuery("SELECT.*organizations").WillReturnRows(orgRows)
}

// expectTupleInsert sets the tuple INSERT expectation with exact
// object_type/object_id/relation/subject args (AnyArg only for ulid/now) and,
// when rowsAffected > 0, the paired changelog INSERT. When rowsAffected == 0
// no changelog expectation is set, so an erroneous changelog write fails the
// test via sqlmock "unexpected Exec".
func expectTupleInsert(t *testing.T, mock sqlmock.Sqlmock, isPG bool, storeID, orgID string, tuple migrationTuple, rowsAffected int64) {
	t.Helper()

	objectID := "organization/" + orgID + "/" + tuple.objectName + "/*"
	roleSubject := "organization/" + orgID + "/role/" + tuple.roleName
	require.NotContains(t, tuple.objectName, "/")

	if isPG {
		user := "role:" + roleSubject + "#assignee"
		// Verifies PG representation and conflict key columns.
		mock.ExpectExec("INSERT INTO tuple").
			WithArgs(storeID, tuple.objectType, objectID, tuple.relation, user, "userset", sqlmock.AnyArg(), sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(1, rowsAffected))
		if rowsAffected == 0 {
			return
		}
		mock.ExpectExec("INSERT INTO changelog").
			WithArgs(storeID, tuple.objectType, objectID, tuple.relation, user, 0, sqlmock.AnyArg(), sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(1, 1))
		return
	}

	mock.ExpectExec("INSERT INTO tuple").
		WithArgs(storeID, tuple.objectType, objectID, tuple.relation, "role", roleSubject, "assignee", "userset", sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, rowsAffected))
	if rowsAffected == 0 {
		return
	}
	mock.ExpectExec("INSERT INTO changelog").
		WithArgs(storeID, tuple.objectType, objectID, tuple.relation, "role", roleSubject, "assignee", 0, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))
}

// expectManagedRoleUpdates sets UPDATE expectations for every managed role and
// asserts the JSON payload is the FULL registry snapshot (not the filtered
// 19), and that the predicate restricts the write to managed roles.
func expectManagedRoleUpdates(t *testing.T, mock sqlmock.Sqlmock, orgIDs []string) {
	t.Helper()

	expected := make(map[string]string, len(coretypes.ManagedRoleToTransactions))
	for roleName, transactions := range coretypes.ManagedRoleToTransactions {
		data, err := json.Marshal(authtypes.NewTransactionGroupsFromTransactions(transactions))
		require.NoError(t, err)
		expected[roleName] = string(data)

		// Critical regression assertion: the snapshot must contain more than
		// the 19 repaired transactions (e.g. dashboard), proving the refresh
		// was not built from the filtered set.
		var groups authtypes.TransactionGroups
		require.NoError(t, json.Unmarshal([]byte(expected[roleName]), &groups))
		if roleName == authtypes.SigNozAdminRoleName {
			kinds := map[string]bool{}
			for _, g := range groups {
				kinds[g.ObjectGroup.Resource.Kind.String()] = true
			}
			require.True(t, kinds["dashboard"], "managed snapshot for %s must include dashboard (full registry, not filtered 19)", roleName)
			require.True(t, kinds["serviceaccount"])
			require.True(t, kinds["factor-api-key"])
			require.True(t, kinds["role"])
		}
	}

	for _, orgID := range orgIDs {
		for roleName, data := range expected {
			// The UPDATE regex requires the managed-role predicate; dropping
			// `type = ?` from the migration breaks this expectation.
			mock.ExpectExec("UPDATE.*role.*transaction_groups.*org_id.*type.*name").
				WithArgs(data, orgID, authtypes.RoleTypeManaged.StringValue(), roleName).
				WillReturnResult(sqlmock.NewResult(0, 1))
		}
	}
}

func runRepairUp(t *testing.T, provider string, storeID string, orgIDs []string, tupleRows func(orgID string, tuple migrationTuple) int64) {
	t.Helper()

	isPG := provider == "postgres"
	store := sqlstoretest.New(sqlstore.Config{Provider: provider}, sqlmock.QueryMatcherRegexp)
	store.Mock().MatchExpectationsInOrder(false)
	migration := &repairSaFactorKeyWildcards{sqlstore: store}

	mock := store.Mock()
	mock.ExpectBegin()
	expectStoreAndOrgs(mock, storeID, orgIDs)
	for _, orgID := range orgIDs {
		for _, tuple := range expectedRepairTuples {
			expectTupleInsert(t, mock, isPG, storeID, orgID, tuple, tupleRows(orgID, tuple))
		}
	}
	expectManagedRoleUpdates(t, mock, orgIDs)
	mock.ExpectCommit()

	require.NoError(t, migration.Up(context.Background(), store.BunDB()))
	require.NoError(t, mock.ExpectationsWereMet())
}

// SQLite: fresh orgs insert all tuples+changelogs; second Up() with all tuples
// existing inserts nothing and writes no changelog rows.
func TestRepairMigrationUp_SQLite(t *testing.T) {
	storeID := "store-sqlite-133"
	orgIDs := []string{"org-133-a", "org-133-b"}

	allNew := func(string, migrationTuple) int64 { return 1 }
	runRepairUp(t, "sqlite", storeID, orgIDs, allNew)

	allExisting := func(string, migrationTuple) int64 { return 0 }
	runRepairUp(t, "sqlite", storeID, orgIDs, allExisting)
}

// PostgreSQL: same idempotence contract, plus PG _user/userset
// representation. The first run simulates one pre-existing tuple
// (SA read for org-a returns 0) to prove the changelog gate.
func TestRepairMigrationUp_Postgres(t *testing.T) {
	storeID := "store-pg-133"
	orgIDs := []string{"org-133-a", "org-133-b"}

	partial := func(orgID string, tuple migrationTuple) int64 {
		if orgID == "org-133-a" && tuple.objectType == "serviceaccount" && tuple.objectName == "serviceaccount" && tuple.relation == "read" {
			return 0
		}
		return 1
	}
	runRepairUp(t, "postgres", storeID, orgIDs, partial)

	allExisting := func(string, migrationTuple) int64 { return 0 }
	runRepairUp(t, "postgres", storeID, orgIDs, allExisting)
}

// sqlmock rejects any unexpected Exec, so DELETE FROM tuple/changelog,
// service_account/factor_api_key writes, or custom-role updates fail these
// tests without a dedicated negative case.
