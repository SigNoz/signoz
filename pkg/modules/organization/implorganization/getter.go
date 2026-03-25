package implorganization

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type getter struct {
	store   types.OrganizationStore
	sharder sharder.Sharder
}

func NewGetter(store types.OrganizationStore, sharder sharder.Sharder) organization.Getter {
	return &getter{store: store, sharder: sharder}
}

func (module *getter) Get(ctx context.Context, id valuer.UUID) (*types.Organization, error) {
	return module.store.Get(ctx, id)
}

func (module *getter) GetByIDOrName(ctx context.Context, id valuer.UUID, name string) (*types.Organization, bool, error) {
	if id.IsZero() {
		org, err := module.store.GetByName(ctx, name)
		if err != nil {
			return nil, false, err
		}

		return org, true, nil
	}

	org, err := module.store.Get(ctx, id)
	if err == nil {
		return org, false, nil
	}

	if !errors.Ast(err, errors.TypeNotFound) {
		return nil, false, err
	}

	org, err = module.store.GetByName(ctx, name)
	if err != nil {
		return nil, false, err
	}

	return org, true, nil
}

func (module *getter) ListByOwnedKeyRange(ctx context.Context) ([]*types.Organization, error) {
	start, end, err := module.sharder.GetMyOwnedKeyRange(ctx)
	if err != nil {
		return nil, err
	}

	return module.store.ListByKeyRange(ctx, start, end)
}

func (module *getter) GetByName(ctx context.Context, name string) (*types.Organization, error) {
	return module.store.GetByName(ctx, name)
}
