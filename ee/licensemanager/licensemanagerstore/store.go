package licensemanagerstore

import (
	"context"

	"github.com/SigNoz/signoz/ee/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/sqlstore"
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
	panic("unimplemented")
}

func (s *store) Get(ctx context.Context, organizationID valuer.UUID, licenseID valuer.UUID) (*licensetypes.StorableLicense, error) {
	panic("unimplemented")
}

func (s *store) GetAll(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.StorableLicense, error) {
	panic("unimplemented")
}

func (s *store) Update(ctx context.Context, storableLicense *licensetypes.StorableLicense) error {
	panic("unimplemented")
}

func (s *store) ListOrganizations(ctx context.Context) ([]string, error) {
	panic("unimplemented")
}

func (s *store) CreateFeature(context.Context, *featuretypes.StorableFeature) error {
	panic("unimplemented")
}

func (s *store) GetAllFeatures(context.Context) ([]*featuretypes.StorableFeature, error) {
	panic("unimplemented")
}

func (s *store) GetFeature(context.Context, string) (*featuretypes.StorableFeature, error) {
	panic("unimplemented")
}

func (s *store) InitFeatures(context.Context, []*featuretypes.StorableFeature) error {
	panic("unimplemented")
}

func (s *store) UpdateFeature(context.Context, *featuretypes.StorableFeature) error {
	panic("unimplemented")
}
