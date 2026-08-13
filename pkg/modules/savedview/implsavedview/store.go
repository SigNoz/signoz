package implsavedview

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) savedviewtypes.Store {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, storable *savedviewtypes.StorableSavedView) error {
	_, err := store.sqlstore.BunDB().NewInsert().Model(storable).Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "saved view with name %s already exists", storable.Name)
	}
	return nil
}

func (store *store) Get(ctx context.Context, orgID string, id valuer.UUID) (*savedviewtypes.StorableSavedView, error) {
	var storable savedviewtypes.StorableSavedView
	err := store.sqlstore.BunDB().NewSelect().Model(&storable).Where("org_id = ? AND id = ?", orgID, id.StringValue()).Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, savedviewtypes.ErrCodeSavedViewNotFound, "saved view %s not found", id.StringValue())
	}

	return &storable, nil
}

func (store *store) Update(ctx context.Context, storable *savedviewtypes.StorableSavedView) error {
	res, err := store.sqlstore.BunDB().NewUpdate().
		Model((*savedviewtypes.StorableSavedView)(nil)).
		Set("updated_at = ?, updated_by = ?, source = ?, data = ?",
			storable.UpdatedAt, storable.UpdatedBy, storable.Source, storable.Data).
		Where("id = ?", storable.ID.StringValue()).
		Where("org_id = ?", storable.OrgID).
		Exec(ctx)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in updating saved view")
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "error in verifying the updated saved view")
	}
	if rowsAffected == 0 {
		return errors.NewNotFoundf(savedviewtypes.ErrCodeSavedViewNotFound, "saved view %s not found", storable.ID.StringValue())
	}

	return nil
}

func (store *store) Delete(ctx context.Context, orgID string, id valuer.UUID) error {
	res, err := store.sqlstore.BunDB().NewDelete().
		Model((*savedviewtypes.StorableSavedView)(nil)).
		Where("id = ?", id.StringValue()).
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
		return errors.NewNotFoundf(savedviewtypes.ErrCodeSavedViewNotFound, "saved view %s not found", id.StringValue())
	}

	return nil
}

func (store *store) List(ctx context.Context, orgID string, source savedviewtypes.Source, name string) ([]*savedviewtypes.RawStorableSavedView, error) {
	var storables []*savedviewtypes.RawStorableSavedView
	q := store.sqlstore.BunDB().NewSelect().Model(&storables).
		Where("org_id = ?", orgID).
		Where("name LIKE ?", "%"+name+"%")
	if !source.IsZero() {
		q = q.Where("source = ?", source)
	}

	if err := q.Scan(ctx); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in getting saved views")
	}

	return storables, nil
}
