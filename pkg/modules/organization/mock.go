package organization

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// NoOpOrgGetter is a mock implementation of OrgGetter that does nothing
type NoOpOrgGetter struct{}

// NewNoOpOrgGetter creates a new mock org getter

func NewNoOpOrgGetter() *NoOpOrgGetter {
	return &NoOpOrgGetter{}
}

func (*NoOpOrgGetter) Get(context.Context, valuer.UUID) (*types.Organization, error) {
	return &types.Organization{}, nil
}
func (*NoOpOrgGetter) ListByOwnedKeyRange(context.Context) ([]*types.Organization, error) {
	return []*types.Organization{}, nil
}
