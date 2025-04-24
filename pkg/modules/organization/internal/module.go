package internal

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type organizationModule struct {
	store types.OrganizationStore
}

func NewModule(organizationStore types.OrganizationStore) *organizationModule {
	return &organizationModule{store: organizationStore}
}

func (o *organizationModule) Create(ctx context.Context, organization *types.Organization) error {
	return o.store.Create(ctx, organization)
}

func (o *organizationModule) Get(ctx context.Context, id valuer.UUID) (*types.Organization, error) {
	return o.store.Get(ctx, id)
}

func (o *organizationModule) GetAll(ctx context.Context) ([]*types.Organization, error) {
	return o.store.GetAll(ctx)
}

func (o *organizationModule) Update(ctx context.Context, updatedOrganization *types.Organization) error {
	return o.store.Update(ctx, updatedOrganization)
}
