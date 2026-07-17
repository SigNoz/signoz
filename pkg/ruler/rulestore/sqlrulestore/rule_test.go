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
