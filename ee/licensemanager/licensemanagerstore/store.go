package licensemanagerstore

import (
	"context"

	"github.com/SigNoz/signoz/ee/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func New(sqlstore sqlstore.SQLStore) licensetypes.Store {
	return &store{sqlstore}
}

func (s *store) CreateFeature(context.Context) {
	panic("unimplemented")
}

func (s *store) CreateV3(context.Context, *licensetypes.LicenseV3) error {
	panic("unimplemented")
}

func (s *store) GetActive(context.Context) (*licensetypes.License, error) {
	panic("unimplemented")
}

func (s *store) GetActiveV3(context.Context) (*licensetypes.LicenseV3, error) {
	panic("unimplemented")
}

func (s *store) GetAllFeatures(context.Context) {
	panic("unimplemented")
}

func (s *store) GetFeature(context.Context) {
	panic("unimplemented")
}

func (s *store) GetV3(context.Context) ([]*licensetypes.LicenseV3, error) {
	panic("unimplemented")
}

func (s *store) InitFeatures(context.Context) {
	panic("unimplemented")
}

func (s *store) UpdateFeature(context.Context) {
	panic("unimplemented")
}

func (s *store) UpdateV3(context.Context, *licensetypes.LicenseV3) error {
	panic("unimplemented")
}
