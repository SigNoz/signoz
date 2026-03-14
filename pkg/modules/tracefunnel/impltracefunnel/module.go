package impltracefunnel

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store traceFunnels.FunnelStore
}

func NewModule(store traceFunnels.FunnelStore) tracefunnel.Module {
	return &module{
		store: store,
	}
}

func (module *module) Create(ctx context.Context, name string, createdBy string, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error) {
	storable := tracefunneltypes.NewStorableFunnel(name, "", nil, "", createdBy, orgID)

	err := module.store.Create(ctx, storable)
	if err != nil {
		return nil, err
	}

	return storable, nil
}

func (module *module) Get(ctx context.Context, id valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error) {
	return module.store.Get(ctx, id, orgID)
}

func (module *module) Update(ctx context.Context, funnel *traceFunnels.StorableFunnel) error {
	return module.store.Update(ctx, funnel)
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*traceFunnels.StorableFunnel, error) {
	funnels, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to list funnels")
	}

	return funnels, nil
}

func (module *module) Delete(ctx context.Context, id valuer.UUID, orgID valuer.UUID) error {
	return module.store.Delete(ctx, id, orgID)
}

func (module *module) GetFunnelMetadata(ctx context.Context, id valuer.UUID, orgID valuer.UUID) (int64, int64, string, error) {
	funnel, err := module.store.Get(ctx, id, orgID)
	if err != nil {
		return 0, 0, "", err
	}

	return funnel.CreatedAt.UnixNano() / 1000000, funnel.UpdatedAt.UnixNano() / 1000000, funnel.Description, nil
}
