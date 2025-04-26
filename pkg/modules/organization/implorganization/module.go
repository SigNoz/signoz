package implorganization

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store types.OrganizationStore
}

func NewModule(organizationStore types.OrganizationStore) organization.Module {
	return &module{store: organizationStore}
}

func (module *module) Create(ctx context.Context, organization *types.Organization) error {
	return module.store.Create(ctx, organization)
}

func (module *module) Get(ctx context.Context, id valuer.UUID) (*types.Organization, error) {
	return module.store.Get(ctx, id)
}

func (module *module) GetAll(ctx context.Context) ([]*types.Organization, error) {
	return module.store.GetAll(ctx)
}

func (module *module) Update(ctx context.Context, updatedOrganization *types.Organization) error {
	return module.store.Update(ctx, updatedOrganization)
}
