package sqllicensingstore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
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

func (store *store) ListOrganizations(ctx context.Context) ([]valuer.UUID, error) {
	orgIDStrs := make([]string, 0)
	err := store.sqlstore.
		BunDB().
		NewSelect().
		Model(new(types.Organization)).
		Column("id").
		Scan(ctx, &orgIDStrs)
	if err != nil {
		return nil, err
	}

	orgIDs := make([]valuer.UUID, len(orgIDStrs))
	for idx, orgIDStr := range orgIDStrs {
		orgID, err := valuer.NewUUID(orgIDStr)
		if err != nil {
			return nil, err
		}
		orgIDs[idx] = orgID
	}

	return orgIDs, nil

}

func (store *store) CreateFeature(ctx context.Context, storableFeature *featuretypes.StorableFeature) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(storableFeature).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "feature with name:%s already exists", storableFeature.Name)
	}

	return nil
}

func (store *store) GetFeature(ctx context.Context, key string) (*featuretypes.StorableFeature, error) {
	storableFeature := new(featuretypes.StorableFeature)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storableFeature).
		Where("name = ?", key).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "feature with name:%s does not exist", key)
	}

	return storableFeature, nil
}

func (store *store) GetAllFeatures(ctx context.Context) ([]*featuretypes.StorableFeature, error) {
	storableFeatures := make([]*featuretypes.StorableFeature, 0)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&storableFeatures).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "features do not exist")
	}

	return storableFeatures, nil
}

func (store *store) InitFeatures(ctx context.Context, storableFeatures []*featuretypes.StorableFeature) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(&storableFeatures).
		On("CONFLICT (name) DO UPDATE").
		Set("active = EXCLUDED.active").
		Set("usage = EXCLUDED.usage").
		Set("usage_limit = EXCLUDED.usage_limit").
		Set("route = EXCLUDED.route").
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to initialise features")
	}

	return nil
}

func (store *store) UpdateFeature(ctx context.Context, storableFeature *featuretypes.StorableFeature) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(storableFeature).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to update feature with key: %s", storableFeature.Name)
	}

	return nil
}
