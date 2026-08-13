package implsavedview

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store    savedviewtypes.Store
	settings factory.ScopedProviderSettings
}

func NewModule(store savedviewtypes.Store, settings factory.ProviderSettings) savedview.Module {
	return &module{
		store:    store,
		settings: factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"),
	}
}

func (module *module) GetViewsForFilters(ctx context.Context, orgID string, source savedviewtypes.Source, name string) ([]*savedviewtypes.SavedView, error) {
	storables, err := module.store.List(ctx, orgID, source, name)
	if err != nil {
		return nil, err
	}

	views := make([]*savedviewtypes.SavedView, 0, len(storables))
	for _, storable := range storables {
		view, err := storable.ToSavedView()
		if err != nil {
			module.settings.Logger().WarnContext(ctx, "saved view data did not decode", slog.String("saved_view_id", storable.ID.StringValue()), slog.Any("error", err))
			continue
		}
		views = append(views, view)
	}

	return views, nil
}

func (module *module) CreateView(ctx context.Context, orgID string, view savedviewtypes.PostableSavedView) (valuer.UUID, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return valuer.UUID{}, errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	dbView := view.ToSavedView(orgID, claims.Email)

	if err := module.store.Create(ctx, savedviewtypes.NewStorableSavedView(dbView)); err != nil {
		return valuer.UUID{}, err
	}
	return dbView.ID, nil
}

func (module *module) GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*savedviewtypes.SavedView, error) {
	storable, err := module.store.Get(ctx, orgID, uuid)
	if err != nil {
		return nil, err
	}

	return storable.ToSavedView(), nil
}

func (module *module) UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view savedviewtypes.UpdatableSavedView) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	dbView := view.ToSavedView(uuid, orgID, claims.Email)
	return module.store.Update(ctx, savedviewtypes.NewStorableSavedView(dbView))
}

func (module *module) DeleteView(ctx context.Context, orgID string, uuid valuer.UUID) error {
	return module.store.Delete(ctx, orgID, uuid)
}

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	storables, err := module.store.List(ctx, orgID.StringValue(), savedviewtypes.Source{}, "")
	if err != nil {
		return nil, err
	}

	return savedviewtypes.NewStatsFromStorableSavedViews(storables), nil
}
