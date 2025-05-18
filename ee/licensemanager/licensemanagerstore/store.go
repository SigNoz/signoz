package licensemanagerstore

import (
	"context"

	"github.com/SigNoz/signoz/ee/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func New(sqlstore sqlstore.SQLStore) licensetypes.Store {
	return &store{sqlstore}
}

func (s *store) Create(ctx context.Context, storableLicense *licensetypes.StorableLicense) error {
	_, err := s.
		sqlstore.
		BunDB().
		NewInsert().
		Model(storableLicense).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeInternal, "unable to create the license with ID: %s", storableLicense.ID)
	}

	return nil
}

func (s *store) Get(ctx context.Context, organizationID valuer.UUID, licenseID valuer.UUID) (*licensetypes.StorableLicense, error) {
	storableLicense := new(licensetypes.StorableLicense)
	err := s.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storableLicense).
		Where("org_id = ?", organizationID).
		Where("id = ?", licenseID).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, errors.CodeInternal, "unable to fetch the license with ID: %s", licenseID)
	}

	return storableLicense, nil
}

func (s *store) GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.StorableLicense, error) {
	storableLicenses := make([]*licensetypes.StorableLicense, 0)
	err := s.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&storableLicenses).
		Where("org_id = ?", organizationID).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, errors.CodeInternal, "unable to fetch the licenses for organization with ID: %s", organizationID)
	}

	return storableLicenses, nil
}

func (s *store) Update(ctx context.Context, storableLicense *licensetypes.StorableLicense) error {
	_, err := s.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(storableLicense).
		Column("data", "last_validated_at").
		WherePK().
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "unable to update license with ID: %s", storableLicense.ID)
	}

	return nil
}

func (s *store) ListOrganizations(ctx context.Context) ([]valuer.UUID, error) {
	orgIDStrs := make([]string, 0)
	err := s.sqlstore.
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

func (s *store) CreateFeature(ctx context.Context, storableFeature *featuretypes.StorableFeature) error {
	_, err := s.
		sqlstore.
		BunDB().
		NewInsert().
		Model(storableFeature).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeInternal, "unable to create feature with name: %s", storableFeature.Name)
	}

	return nil
}

func (s *store) GetFeature(ctx context.Context, key string) (*featuretypes.StorableFeature, error) {
	storableFeature := new(featuretypes.StorableFeature)
	err := s.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storableFeature).
		Where("name = ?", key).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, errors.CodeInternal, "unable to fetch the feature with key: %s", key)
	}

	return storableFeature, nil
}

func (s *store) GetAllFeatures(ctx context.Context) ([]*featuretypes.StorableFeature, error) {
	storableFeatures := make([]*featuretypes.StorableFeature, 0)
	err := s.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&storableFeatures).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, errors.CodeInternal, "unable to fetch all features")
	}

	return storableFeatures, nil
}

func (s *store) InitFeatures(ctx context.Context, storableFeatures []*featuretypes.StorableFeature) error {
	_, err := s.
		sqlstore.
		BunDB().
		NewInsert().
		Model(&storableFeatures).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeInternal, "unable to init features")
	}

	return nil
}

func (s *store) UpdateFeature(ctx context.Context, storableFeature *featuretypes.StorableFeature) error {
	_, err := s.
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
