package implorganization

import (
	"context"

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

func (module *getter) ListByOwnedKeyRange(ctx context.Context) ([]*types.Organization, error) {
	start, end, err := module.sharder.GetMyOwnedKeyRange(ctx)
	if err != nil {
		return nil, err
	}

	return module.store.ListByKeyRange(ctx, start, end)
}
