package implsavedview

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	sqlstore sqlstore.SQLStore
}

func NewModule(sqlstore sqlstore.SQLStore) savedview.Module {
	return &module{sqlstore: sqlstore}
}

func (module *module) GetViewsForFilters(ctx context.Context, orgID string, sourcePage string, name string, category string) ([]*savedviewtypes.GettableSavedView, error) {
	var views []*savedviewtypes.StorableSavedView
	var err error
	if len(category) == 0 {
		err = module.sqlstore.BunDB().NewSelect().Model(&views).Where("org_id = ? AND source_page = ? AND name LIKE ?", orgID, sourcePage, "%"+name+"%").Scan(ctx)
	} else {
		err = module.sqlstore.BunDB().NewSelect().Model(&views).Where("org_id = ? AND source_page = ? AND category LIKE ? AND name LIKE ?", orgID, sourcePage, "%"+category+"%", "%"+name+"%").Scan(ctx)
	}
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in getting saved views")
	}

	return savedviewtypes.NewGettableSavedViewsFromStorable(views)
}

func (module *module) CreateView(ctx context.Context, orgID string, view savedviewtypes.PostableSavedView) (valuer.UUID, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return valuer.UUID{}, errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	dbView, err := savedviewtypes.NewStorableSavedView(orgID, claims.Email, view)
	if err != nil {
		return valuer.UUID{}, err
	}

	_, err = module.sqlstore.BunDB().NewInsert().Model(dbView).Exec(ctx)
	if err != nil {
		return valuer.UUID{}, errors.WrapInternalf(err, errors.CodeInternal, "error in creating saved view")
	}
	return dbView.ID, nil
}

func (module *module) GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*savedviewtypes.GettableSavedView, error) {
	var view savedviewtypes.StorableSavedView
	err := module.sqlstore.BunDB().NewSelect().Model(&view).Where("org_id = ? AND id = ?", orgID, uuid.StringValue()).Scan(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in getting saved view")
	}

	return savedviewtypes.NewGettableSavedViewFromStorable(&view)
}

func (module *module) UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view savedviewtypes.UpdatableSavedView) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	dbView, err := savedviewtypes.NewStorableSavedView(orgID, claims.Email, view)
	if err != nil {
		return err
	}

	_, err = module.sqlstore.BunDB().NewUpdate().
		Model(&savedviewtypes.StorableSavedView{}).
		Set("updated_at = ?, updated_by = ?, name = ?, category = ?, source_page = ?, tags = ?, data = ?, extra_data = ?",
			dbView.UpdatedAt, dbView.UpdatedBy, dbView.Name, dbView.Category, dbView.SourcePage, dbView.Tags, dbView.Data, dbView.ExtraData).
		Where("id = ?", uuid.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in updating saved view")
	}
	return nil
}

func (module *module) DeleteView(ctx context.Context, orgID string, uuid valuer.UUID) error {
	_, err := module.sqlstore.BunDB().NewDelete().
		Model(&savedviewtypes.StorableSavedView{}).
		Where("id = ?", uuid.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in deleting explorer query")
	}
	return nil
}

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	savedViews := []*savedviewtypes.StorableSavedView{}

	err := module.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&savedViews).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return savedviewtypes.NewStatsFromSavedViews(savedViews), nil
}
