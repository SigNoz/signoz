package rulestoretest

import (
	"context"

	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/mock"
)

// MockRuleStore is a mock implementation of RuleStore for testing
type MockRuleStore struct {
	mock.Mock
}

func (m *MockRuleStore) CreateRule(ctx context.Context, rule *ruletypes.Rule, fn func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	args := m.Called(ctx, rule, fn)
	return args.Get(0).(valuer.UUID), args.Error(1)
}

func (m *MockRuleStore) EditRule(ctx context.Context, rule *ruletypes.Rule, fn func(context.Context) error) error {
	args := m.Called(ctx, rule, fn)
	return args.Error(0)
}

func (m *MockRuleStore) DeleteRule(ctx context.Context, id valuer.UUID, fn func(context.Context) error) error {
	args := m.Called(ctx, id, fn)
	return args.Error(0)
}

func (m *MockRuleStore) GetStoredRule(ctx context.Context, id valuer.UUID) (*ruletypes.Rule, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*ruletypes.Rule), args.Error(1)
}

func (m *MockRuleStore) GetStoredRules(ctx context.Context, orgID string) ([]*ruletypes.Rule, error) {
	args := m.Called(ctx, orgID)
	return args.Get(0).([]*ruletypes.Rule), args.Error(1)
}
