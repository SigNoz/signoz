package sqlrulestore_test

import (
	"context"
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
