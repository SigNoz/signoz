package implsavedview

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store savedviewtypes.Store
}

func NewModule(store savedviewtypes.Store) savedview.Module {
	return &module{store: store}
}

func (module *module) GetViewsForFilters(ctx context.Context, orgID string, source savedviewtypes.Source, name string) ([]*savedviewtypes.SavedView, error) {
	return module.store.List(ctx, orgID, source, name)
}

func (module *module) CreateView(ctx context.Context, orgID string, view savedviewtypes.PostableSavedView) (valuer.UUID, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return valuer.UUID{}, errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	dbView := view.ToSavedView(orgID, claims.Email)

	if err := module.store.Create(ctx, dbView); err != nil {
		return valuer.UUID{}, err
	}
	return dbView.ID, nil
}

func (module *module) GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*savedviewtypes.SavedView, error) {
	return module.store.Get(ctx, orgID, uuid)
}

func (module *module) UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view savedviewtypes.UpdatableSavedView) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	return module.store.Update(ctx, view.ToSavedView(uuid, orgID, claims.Email))
}

func (module *module) DeleteView(ctx context.Context, orgID string, uuid valuer.UUID) error {
	return module.store.Delete(ctx, orgID, uuid)
}

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	savedViews, err := module.store.List(ctx, orgID.StringValue(), savedviewtypes.Source{}, "")
	if err != nil {
		return nil, err
	}

	return savedviewtypes.NewStatsFromSavedViews(savedViews), nil
}
