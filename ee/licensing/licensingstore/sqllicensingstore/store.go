package sqllicensingstore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func New(sqlstore sqlstore.SQLStore) licensetypes.Store {
	return &store{sqlstore}
}

func (store *store) Create(ctx context.Context, storableLicense *licensetypes.StorableLicense) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(storableLicense).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "license with ID: %s already exists", storableLicense.ID)
	}

	return nil
}

func (store *store) Get(ctx context.Context, organizationID valuer.UUID, licenseID valuer.UUID) (*licensetypes.StorableLicense, error) {
	storableLicense := new(licensetypes.StorableLicense)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storableLicense).
		Where("org_id = ?", organizationID).
		Where("id = ?", licenseID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "license with ID: %s does not exist", licenseID)
	}

	return storableLicense, nil
}

func (store *store) GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.StorableLicense, error) {
	storableLicenses := make([]*licensetypes.StorableLicense, 0)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&storableLicenses).
		Where("org_id = ?", organizationID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "licenses for organizationID: %s does not exists", organizationID)
	}

	return storableLicenses, nil
}

func (store *store) Update(ctx context.Context, organizationID valuer.UUID, storableLicense *licensetypes.StorableLicense) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(storableLicense).
		WherePK().
		Where("org_id = ?", organizationID).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to update license with ID: %s", storableLicense.ID)
	}

	return nil
}
