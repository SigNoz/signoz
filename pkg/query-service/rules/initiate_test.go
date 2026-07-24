package rules

import (
	"context"
	"sync"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// fakeOrgGetter embeds organization.Getter so it satisfies the full interface
// while only overriding the method initiate uses.
type fakeOrgGetter struct {
	organization.Getter
	orgs []*types.Organization
}

func (f *fakeOrgGetter) ListByOwnedKeyRange(_ context.Context) ([]*types.Organization, error) {
	return f.orgs, nil
}

// recordingRuleStore records which orgs were queried and returns no rules, so
// every org exercises the "no stored rules" branch of initiate.
type recordingRuleStore struct {
	ruletypes.RuleStore
	mu      sync.Mutex
	visited []string
}

func (r *recordingRuleStore) GetStoredRules(_ context.Context, orgID string) ([]*ruletypes.StorableRule, error) {
	r.mu.Lock()
	r.visited = append(r.visited, orgID)
	r.mu.Unlock()
	return nil, nil
}

// TestInitiateVisitsAllOrgsWhenSomeHaveNoRules guards against a regression where
// an org with zero stored rules caused initiate to return early, abandoning the
// rules of every org after it.
func TestInitiateVisitsAllOrgsWhenSomeHaveNoRules(t *testing.T) {
	orgA := &types.Organization{Identifiable: types.Identifiable{ID: valuer.GenerateUUID()}}
	orgB := &types.Organization{Identifiable: types.Identifiable{ID: valuer.GenerateUUID()}}

	store := &recordingRuleStore{}
	m := &Manager{
		logger:    instrumentationtest.New().Logger(),
		orgGetter: &fakeOrgGetter{orgs: []*types.Organization{orgA, orgB}},
		ruleStore: store,
	}

	require.NoError(t, m.initiate(context.Background()))
	require.Equal(t,
		[]string{orgA.ID.StringValue(), orgB.ID.StringValue()},
		store.visited,
		"initiate must visit every org even when an earlier org has no rules",
	)
}
