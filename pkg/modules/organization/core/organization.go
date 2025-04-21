package core

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type organizationUsecase struct {
	store types.OrganizationStore
}

func NewUsecase(organizationStore types.OrganizationStore) organization.Usecase {
	return &organizationUsecase{store: organizationStore}
}

func (o *organizationUsecase) Create(ctx context.Context, organization *types.Organization) error {
	return o.store.Create(ctx, organization)
}

func (o *organizationUsecase) Get(ctx context.Context, id valuer.UUID) (*types.Organization, error) {
	return o.store.Get(ctx, id)
}

func (o *organizationUsecase) GetAll(ctx context.Context) ([]*types.Organization, error) {
	return o.store.GetAll(ctx)
}

func (o *organizationUsecase) Update(ctx context.Context, updatedOrganization *types.Organization) error {
	return o.store.Update(ctx, updatedOrganization)
}
