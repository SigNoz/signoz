package rules

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type fakeOrgGetter struct {
	orgs []*types.Organization
}

func (f *fakeOrgGetter) Get(context.Context, valuer.UUID) (*types.Organization, error) {
	return nil, nil
}

func (f *fakeOrgGetter) GetByIDOrName(context.Context, valuer.UUID, string) (*types.Organization, bool, error) {
	return nil, false, nil
}

func (f *fakeOrgGetter) ListByOwnedKeyRange(context.Context) ([]*types.Organization, error) {
	return f.orgs, nil
}

func (f *fakeOrgGetter) GetByName(context.Context, string) (*types.Organization, error) {
	return nil, nil
}

type fakeRuleStore struct {
	rulesByOrg map[string][]*ruletypes.StorableRule
}

func (f *fakeRuleStore) CreateRule(context.Context, *ruletypes.StorableRule, func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	return valuer.UUID{}, nil
}

func (f *fakeRuleStore) EditRule(context.Context, *ruletypes.StorableRule, func(context.Context) error) error {
	return nil
}

func (f *fakeRuleStore) DeleteRule(context.Context, valuer.UUID, valuer.UUID, func(context.Context) error) error {
	return nil
}

func (f *fakeRuleStore) GetStoredRules(_ context.Context, orgID string) ([]*ruletypes.StorableRule, error) {
	return f.rulesByOrg[orgID], nil
}

func (f *fakeRuleStore) GetStoredRule(context.Context, valuer.UUID, valuer.UUID) (*ruletypes.StorableRule, error) {
	return nil, nil
}

func (f *fakeRuleStore) GetStoredRulesByMetricName(context.Context, string, string) ([]ruletypes.RuleAlert, error) {
	return nil, nil
}

// TestManager_Initiate_ContinuesPastOrgsWithNoRules guards against a regression where initiate()
// returned on the first org with no stored rules instead of continuing to the next org, silently
// skipping rule-loading for every org that came after it.
func TestManager_Initiate_ContinuesPastOrgsWithNoRules(t *testing.T) {
	orgWithNoRules := types.NewOrganization("empty-org", "empty-org")
	orgWithRule := types.NewOrganization("org-with-rule", "org-with-rule")

	ruleStore := &fakeRuleStore{
		rulesByOrg: map[string][]*ruletypes.StorableRule{
			orgWithRule.ID.StringValue(): {
				{Data: "not-json"},
			},
		},
	}

	m := &Manager{
		logger:    instrumentationtest.New().Logger(),
		ruleStore: ruleStore,
		orgGetter: &fakeOrgGetter{orgs: []*types.Organization{orgWithNoRules, orgWithRule}},
	}

	err := m.initiate(context.Background())

	require.Error(t, err)
}
