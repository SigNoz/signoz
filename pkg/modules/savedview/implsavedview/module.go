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

func (module *module) GetViewsForFilters(ctx context.Context, orgID string, sourcePage savedviewtypes.SourcePage, name string) ([]*savedviewtypes.GettableSavedView, error) {
	var views []*savedviewtypes.SavedView
	err := module.sqlstore.BunDB().NewSelect().Model(&views).
		Where("org_id = ? AND source_page = ? AND name LIKE ?", orgID, sourcePage, "%"+name+"%").
		Scan(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in getting saved views")
	}

	return savedviewtypes.NewGettableSavedViewsFromSavedViews(views), nil
}

func (module *module) CreateView(ctx context.Context, orgID string, view savedviewtypes.PostableSavedView) (valuer.UUID, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return valuer.UUID{}, errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	dbView := savedviewtypes.NewSavedView(orgID, claims.Email, claims.Email, view)

	_, err = module.sqlstore.BunDB().NewInsert().Model(dbView).Exec(ctx)
	if err != nil {
		return valuer.UUID{}, errors.WrapInternalf(err, errors.CodeInternal, "error in creating saved view")
	}
	return dbView.ID, nil
}

func (module *module) GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*savedviewtypes.GettableSavedView, error) {
	var view savedviewtypes.SavedView
	err := module.sqlstore.BunDB().NewSelect().Model(&view).Where("org_id = ? AND id = ?", orgID, uuid.StringValue()).Scan(ctx)
	if err != nil {
		return nil, module.sqlstore.WrapNotFoundErrf(err, savedviewtypes.ErrCodeSavedViewNotFound, "saved view %s not found", uuid.StringValue())
	}

	return savedviewtypes.NewGettableSavedViewFromSavedView(&view), nil
}

func (module *module) UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view savedviewtypes.UpdatableSavedView) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "error in getting email from context")
	}

	dbView := savedviewtypes.NewSavedView(orgID, claims.Email, claims.Email, view)

	res, err := module.sqlstore.BunDB().NewUpdate().
		Model(&savedviewtypes.SavedView{}).
		Set("updated_at = ?, updated_by = ?, name = ?, source_page = ?, data = ?",
			dbView.UpdatedAt, dbView.UpdatedBy, dbView.Name, dbView.SourcePage, dbView.Data).
		Where("id = ?", uuid.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in updating saved view")
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in verifying the updated saved view")
	}
	if rowsAffected == 0 {
		return errors.NewNotFoundf(savedviewtypes.ErrCodeSavedViewNotFound, "saved view %s not found", uuid.StringValue())
	}

	return nil
}

func (module *module) DeleteView(ctx context.Context, orgID string, uuid valuer.UUID) error {
	res, err := module.sqlstore.BunDB().NewDelete().
		Model(&savedviewtypes.SavedView{}).
		Where("id = ?", uuid.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in deleting saved view")
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in verifying the deleted saved view")
	}
	if rowsAffected == 0 {
		return errors.NewNotFoundf(savedviewtypes.ErrCodeSavedViewNotFound, "saved view %s not found", uuid.StringValue())
	}

	return nil
}

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	savedViews := []*savedviewtypes.SavedView{}

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
