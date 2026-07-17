package sqlrulestore_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/ruler/rulestore/rulestoretest"
	"github.com/SigNoz/signoz/pkg/types"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// testTime is reused across the test cases below so the created_at/updated_at
// columns match what the sqlmock fixture expects.
var testTime = time.Date(2026, 7, 17, 0, 0, 0, 0, time.UTC)

// newTestRule returns a minimal StorableRule wired to the given orgID and id.
// CreatedAt/UpdatedAt are populated because the fixture's expected row shape
// includes those columns.
func newTestRule(orgID string, id valuer.UUID) *ruletypes.StorableRule {
	return &ruletypes.StorableRule{
		Identifiable: types.Identifiable{ID: id},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: testTime,
			UpdatedAt: testTime,
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: "test-user",
			UpdatedBy: "test-user",
		},
		OrgID: orgID,
		Data:  `{"alert":"test","alertType":"metric","ruleType":"threshold","condition":null}`,
	}
}

func TestCreateRule_HappyPath(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgID := "org-create-1"
	ruleID := valuer.GenerateUUID()
	rule := newTestRule(orgID, ruleID)

	store.ExpectCreateRule(rule)

	called := false
	gotID, err := store.CreateRule(ctx, rule, func(_ context.Context, _ valuer.UUID) error {
		called = true
		return nil
	})

	require.NoError(t, err)
	require.Equal(t, ruleID, gotID)
	require.True(t, called, "CreateRule must invoke the post-insert callback")
	require.NoError(t, store.AssertExpectations())
}

func TestEditRule_HappyPath(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgID := "org-edit-1"
	ruleID := valuer.GenerateUUID()
	rule := newTestRule(orgID, ruleID)

	store.ExpectEditRule(rule)

	called := false
	err := store.EditRule(ctx, rule, func(_ context.Context) error {
		called = true
		return nil
	})

	require.NoError(t, err)
	require.True(t, called, "EditRule must invoke the post-update callback")
	require.NoError(t, store.AssertExpectations())
}

func TestDeleteRule_HappyPath(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgID := valuer.GenerateUUID()
	ruleID := valuer.GenerateUUID()

	store.ExpectDeleteRule(ruleID)

	called := false
	err := store.DeleteRule(ctx, orgID, ruleID, func(_ context.Context) error {
		called = true
		return nil
	})

	require.NoError(t, err)
	require.True(t, called, "DeleteRule must invoke the post-delete callback")
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRule_NotFound(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgID := valuer.GenerateUUID()
	ruleID := valuer.GenerateUUID()

	store.Mock().ExpectQuery(`SELECT (.+) FROM "rule".+WHERE \(org_id = '.+'\) AND \(id = '` + ruleID.StringValue() + `'\)`).
		WillReturnError(errors.New("sql: no rows in result set"))

	_, err := store.GetStoredRule(ctx, orgID, ruleID)

	require.Error(t, err, "GetStoredRule must wrap a missing row into a not-found error")
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRules_Empty(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgIDStr := "org-empty"
	store.ExpectGetStoredRules(orgIDStr, nil)

	rules, err := store.GetStoredRules(ctx, orgIDStr)

	require.NoError(t, err)
	require.Empty(t, rules)
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRules_Populated(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgIDStr := "org-populated-1"
	want := []*ruletypes.StorableRule{
		newTestRule(orgIDStr, valuer.GenerateUUID()),
		newTestRule(orgIDStr, valuer.GenerateUUID()),
	}

	store.ExpectGetStoredRules(orgIDStr, want)

	got, err := store.GetStoredRules(ctx, orgIDStr)

	require.NoError(t, err)
	require.Len(t, got, 2)
	require.Equal(t, want[0].ID, got[0].ID)
	require.Equal(t, want[1].ID, got[1].ID)
	require.NoError(t, store.AssertExpectations())
}

// TestGetStoredRules_MultiOrgIsolation is the regression coverage for the
// "first org instead of rule org" bug (#11351): a rule stored under org A
// must not surface when querying GetStoredRules for org B.
func TestGetStoredRules_MultiOrgIsolation(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgA := "org-A"
	orgB := "org-B"

	// The mock only knows about orgA's rules. Querying orgB's view must
	// therefore return an empty slice even though orgA has rules.
	rulesInA := []*ruletypes.StorableRule{newTestRule(orgA, valuer.GenerateUUID())}
	store.ExpectGetStoredRules(orgA, rulesInA)
	store.ExpectGetStoredRules(orgB, nil)

	gotA, err := store.GetStoredRules(ctx, orgA)
	require.NoError(t, err)
	require.Len(t, gotA, 1, "org A should see its own rule")

	gotB, err := store.GetStoredRules(ctx, orgB)
	require.NoError(t, err)
	require.Empty(t, gotB, "org B must not see org A's rules")

	require.NoError(t, store.AssertExpectations())
}
